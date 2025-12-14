import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useAuthModal } from "../auth/auth-modal-context";
import { Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
    productId: number;
    size?: "sm" | "default" | "lg" | "icon";
    variant?: "default" | "ghost" | "outline";
    className?: string;
    showText?: boolean;
    /** If provided, skip individual API check and use this value */
    isInWishlistProp?: boolean;
}

export default function WishlistButton({
    productId,
    size = "icon",
    variant = "ghost",
    className,
    showText = false,
    isInWishlistProp
}: WishlistButtonProps) {
    const { i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { isAuthenticated } = useAuth();
    const { openLogin } = useAuthModal();
    const [isInWishlist, setIsInWishlist] = useState(isInWishlistProp ?? false);
    const [isAnimating, setIsAnimating] = useState(false);

    // Only check individually if prop not provided
    const shouldCheckIndividually = isInWishlistProp === undefined;
    const { data: wishlistCheck, isLoading } = useQuery<{ inWishlist: boolean }>({
        queryKey: [`/api/wishlist/${productId}/check`],
        enabled: shouldCheckIndividually,
    });

    useEffect(() => {
        // Prefer prop over query
        if (isInWishlistProp !== undefined) {
            setIsInWishlist(isInWishlistProp);
        } else if (wishlistCheck) {
            setIsInWishlist(wishlistCheck.inWishlist);
        }
    }, [wishlistCheck, isInWishlistProp]);

    const addToWishlistMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/wishlist/${productId}`, {
                method: "POST",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to add to wishlist");
            return res.json();
        },
        onSuccess: () => {
            setIsInWishlist(true);
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), 500);
            queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
            queryClient.invalidateQueries({ queryKey: ["/api/wishlist/product-ids"] });
            queryClient.invalidateQueries({ queryKey: [`/api/wishlist/${productId}/check`] });
            toast({
                title: isRTL ? "❤️ تمت الإضافة" : "❤️ Added",
                description: isRTL ? "تمت إضافة المنتج للمفضلة" : "Added to wishlist",
            });
        },
        onError: () => {
            toast({
                title: isRTL ? "خطأ" : "Error",
                description: isRTL ? "فشلت إضافة المنتج للمفضلة" : "Failed to add to wishlist",
                variant: "destructive",
            });
        },
    });

    const removeFromWishlistMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/wishlist/${productId}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to remove from wishlist");
        },
        onSuccess: () => {
            setIsInWishlist(false);
            queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
            queryClient.invalidateQueries({ queryKey: ["/api/wishlist/product-ids"] });
            queryClient.invalidateQueries({ queryKey: [`/api/wishlist/${productId}/check`] });
            toast({
                title: isRTL ? "تمت الإزالة" : "Removed",
                description: isRTL ? "تمت إزالة المنتج من المفضلة" : "Removed from wishlist",
            });
        },
    });

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Works for guests too, just like cart
        if (isInWishlist) {
            removeFromWishlistMutation.mutate();
        } else {
            addToWishlistMutation.mutate();
        }
    };

    const isPending = addToWishlistMutation.isPending || removeFromWishlistMutation.isPending;

    return (
        <Button
            variant={variant}
            size={size}
            className={cn(
                "rounded-full transition-all duration-300 active:scale-90",
                isInWishlist && "text-red-500 hover:text-red-600",
                isAnimating && "animate-bounce",
                className
            )}
            onClick={handleClick}
            disabled={isPending || isLoading}
            aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
            {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <>
                    <Heart
                        className={cn(
                            "transition-all duration-200",
                            size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-5 h-5" : "w-4 h-4",
                            isInWishlist && "fill-red-500 scale-110",
                            showText && "me-2"
                        )}
                    />
                    {showText && (
                        <span className="text-sm">
                            {isInWishlist
                                ? (isRTL ? 'في المفضلة' : 'Saved')
                                : (isRTL ? 'أضف للمفضلة' : 'Save')
                            }
                        </span>
                    )}
                </>
            )}
        </Button>
    );
}
