import { memo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Minus, Bell, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { translateContent } from "@/lib/translator";
import WishlistButton from "./wishlist-button";

interface ProductCardProps {
    product: {
        id: number;
        name: string;
        englishName?: string | null;
        price: string;
        imageUrl?: string | null;
        stock?: number | null;
        isAvailable?: boolean | null;
        unit?: string | null;
        categoryId?: number | null;
    };
    quantity?: number;
    onAddToCart: () => void;
    onIncrement: () => void;
    onDecrement: () => void;
    onNotifyMe?: () => void;
    onClick?: () => void;
    isLoading?: boolean;
    isRTL?: boolean;
    isNotifySubscribed?: boolean;
    showWishlist?: boolean;
    isInWishlist?: boolean;
    t: (key: string) => string;
}

export const ProductCard = memo(function ProductCard({
    product,
    quantity = 0,
    onAddToCart,
    onIncrement,
    onDecrement,
    onNotifyMe,
    onClick,
    isLoading = false,
    isRTL = false,
    isNotifySubscribed = false,
    showWishlist = true,
    isInWishlist,
    t,
}: ProductCardProps) {
    const [isPressed, setIsPressed] = useState(false);

    const isOutOfStock = !product.isAvailable || product.stock === 0;
    const isLowStock = (product.stock || 0) > 0 && (product.stock || 0) < 10;

    // Get display name based on language
    const getDisplayName = () => {
        if (!isRTL) {
            // English mode - use englishName first, then translate Arabic name
            if (product.englishName) {
                return product.englishName;
            }
            return translateContent(product.name, 'en');
        }
        // Arabic mode - use the original name
        return product.name;
    };

    const getStockBadge = () => {
        if (isOutOfStock) {
            return (
                <Badge className="absolute top-2 left-2 rtl:left-auto rtl:right-2 bg-red-500/90 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                    {isRTL ? 'نفذ' : 'Out'}
                </Badge>
            );
        }
        if (isLowStock) {
            return (
                <Badge className="absolute top-2 left-2 rtl:left-auto rtl:right-2 bg-amber-500/90 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                    {isRTL ? 'قليل' : 'Low'}
                </Badge>
            );
        }
        return null;
    };

    return (
        <Card
            className={cn(
                "group relative overflow-hidden border-0 bg-white dark:bg-slate-900 rounded-2xl cursor-pointer will-animate",
                "transition-all duration-200",
                // Mobile: Quick tap feedback
                "active:scale-[0.98] active:shadow-md lg:active:scale-100",
                // Desktop: Elevated hover
                "lg:hover:shadow-xl lg:hover:-translate-y-1.5",
                // Gradient overlay on hover
                "before:absolute before:inset-0 before:rounded-2xl before:opacity-0 before:transition-opacity before:duration-300",
                "hover:before:opacity-100 before:bg-gradient-to-br before:from-primary/5 before:to-accent/5 before:pointer-events-none",
                isOutOfStock && "opacity-80"
            )}
            style={{
                boxShadow: "0px 2px 8px -2px rgba(0, 0, 0, 0.08)"
            }}
            onClick={onClick}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
        >
            {/* Product Image Section */}
            <div
                className="relative aspect-square overflow-hidden"
            >
                {/* Image */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                    {(product.imageUrl?.startsWith('http') || product.imageUrl?.startsWith('/')) ? (
                        <>
                            <img
                                src={product.imageUrl}
                                alt={getDisplayName()}
                                className={cn(
                                    "w-full h-full object-cover will-animate",
                                    "transition-all duration-500 ease-out",
                                    // Desktop: Zoom + brightness on hover
                                    "lg:group-hover:scale-110 lg:group-hover:brightness-105",
                                    // Mobile: Subtle brightness only
                                    "group-active:brightness-95"
                                )}
                                loading="lazy"
                            />
                            {/* Subtle gradient overlay on hover */}
                            <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl">
                            {product.imageUrl || <Package className="w-16 h-16 text-slate-300" />}
                        </div>
                    )}
                </div>

                {/* Out of Stock Overlay */}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="text-white font-bold text-sm border-2 border-white px-4 py-1.5 rounded-full transform -rotate-12 shadow-lg">
                            {isRTL ? 'نفذ المخزون' : 'OUT OF STOCK'}
                        </span>
                    </div>
                )}

                {/* Stock Badge */}
                {getStockBadge()}

                {/* Wishlist Button */}
                {showWishlist && (
                    <div className="absolute top-2 right-2 rtl:right-auto rtl:left-2 z-10">
                        <WishlistButton
                            productId={product.id}
                            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm h-8 w-8"
                            isInWishlistProp={isInWishlist}
                        />
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-3 space-y-2">
                {/* Product Name */}
                <h3
                    className={cn(
                        "font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5rem]",
                        "group-hover:text-primary transition-colors",
                        isRTL ? "text-right" : "text-left"
                    )}
                >
                    {getDisplayName()}
                </h3>

                {/* Price Row */}
                <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-primary">
                        {product.price}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {isRTL ? 'جنيه' : 'EGP'}
                    </span>
                    {product.unit && (
                        <span className="text-[10px] text-muted-foreground/70 ml-auto rtl:mr-auto rtl:ml-0">
                            / {t(product.unit)}
                        </span>
                    )}
                </div>

                {/* Action Button */}
                <div className="pt-1">
                    {isOutOfStock ? (
                        // Notify Me Button
                        <Button
                            variant="secondary"
                            className={cn(
                                "w-full h-10 rounded-xl text-sm font-medium gap-2 border border-amber-200 dark:border-amber-900/50",
                                "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
                                !isNotifySubscribed && "hover:bg-amber-100 dark:hover:bg-amber-900/30",
                                isNotifySubscribed && "opacity-80 cursor-default"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isNotifySubscribed) onNotifyMe?.();
                            }}
                            disabled={isLoading || isNotifySubscribed}
                        >
                            <Bell className="w-4 h-4" />
                            {isNotifySubscribed
                                ? (isRTL ? 'سنعلمك عند التوفر' : "We'll notify you")
                                : (isRTL ? 'أعلمني' : 'Notify Me')
                            }
                        </Button>
                    ) : quantity === 0 ? (
                        // Add to Cart Button with gradient and spring animation
                        <Button
                            className={cn(
                                "w-full h-10 rounded-xl text-sm font-medium gap-2 will-animate",
                                "bg-gradient-primary text-white border-0",
                                "transition-all duration-200",
                                // Mobile: Quick tap
                                "active:scale-95",
                                // Desktop: Spring bounce + glow
                                "lg:hover:shadow-primary lg:hover:scale-105",
                                "lg:active:scale-100"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart();
                            }}
                            disabled={isLoading}
                        >
                            <ShoppingCart className="w-4 h-4" />
                            {isRTL ? 'أضف' : 'Add'}
                        </Button>
                    ) : (
                        // Quantity Selector with glassmorphism and smooth animations
                        <div
                            className={cn(
                                "flex items-center justify-between rounded-xl p-1 will-animate",
                                "bg-gradient-to-r from-primary/10 via-primary/15 to-primary/10",
                                "transition-all duration-200",
                                "hover:from-primary/15 hover:via-primary/20 hover:to-primary/15"
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-8 w-8 rounded-lg will-animate",
                                    "hover:bg-white dark:hover:bg-slate-800 shadow-sm",
                                    "transition-all duration-150",
                                    "active:scale-95 lg:hover:scale-105"
                                )}
                                onClick={onDecrement}
                                disabled={isLoading}
                            >
                                <Minus className="w-4 h-4" />
                            </Button>
                            <span className="font-bold text-base text-primary min-w-[2rem] text-center transition-all duration-200">
                                {quantity}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-8 w-8 rounded-lg will-animate",
                                    "hover:bg-white dark:hover:bg-slate-800 shadow-sm",
                                    "transition-all duration-150",
                                    "active:scale-95 lg:hover:scale-105"
                                )}
                                onClick={onIncrement}
                                disabled={isLoading}
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
});

export default ProductCard;
