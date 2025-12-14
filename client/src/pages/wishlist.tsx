import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "wouter";
import {
    Heart,
    ShoppingCart,
    Trash2,
    Package,
    ShoppingBag,
    Loader2,
    LogIn
} from "lucide-react";
import { translateContent } from "@/lib/translator";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProductDetailsContent } from "@/components/shop/product-details-content";
import type { Product } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useAuthModal } from "@/components/auth/auth-modal-context";

interface WishlistItem {
    id: number;
    userId: string;
    productId: number;
    createdAt: Date;
    product: {
        id: number;
        name: string;
        englishName: string | null;
        price: string;
        originalPrice: string | null;
        imageUrl: string | null;
        isAvailable: boolean;
        stock: number;
        unit: string;
    };
}

export default function Wishlist() {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [, setLocation] = useLocation();
    const isMobile = useIsMobile();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const { user } = useAuth();
    const { openLogin } = useAuthModal();

    // Fetch wishlist (works for guests too, like cart)
    const { data: wishlistItems = [], isLoading } = useQuery<WishlistItem[]>({
        queryKey: ["/api/wishlist"],
    });

    // Fetch cart for quantity checks
    const { data: cartItems = [] } = useQuery<any[]>({
        queryKey: ["/api/cart"],
    });

    const getProductName = (product: any) => {
        if (i18n.language === 'en' && product.englishName) {
            return product.englishName;
        }
        return translateContent(product.name, i18n.language);
    };

    const getCartQuantity = (productId: number) => {
        const item = cartItems.find((i: any) => i.product?.id === productId);
        return item?.quantity || 0;
    };

    const removeFromWishlistMutation = useMutation({
        mutationFn: async (productId: number) => {
            const res = await fetch(`/api/wishlist/${productId}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to remove from wishlist");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
            toast({
                title: isRTL ? "تمت الإزالة" : "Removed",
                description: isRTL ? "تمت إزالة المنتج من المفضلة" : "Product removed from wishlist",
            });
        },
    });

    const addToCartMutation = useMutation({
        mutationFn: async (productId: number) => {
            const res = await fetch("/api/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ productId, quantity: 1 }),
            });
            if (!res.ok) throw new Error("Failed to add to cart");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
            toast({
                title: isRTL ? "تمت الإضافة ✓" : "Added ✓",
                description: isRTL ? "تمت إضافة المنتج للسلة" : "Product added to cart",
            });
        },
    });

    const updateCartMutation = useMutation({
        mutationFn: async ({ productId, quantity }: { productId: number; quantity: number }) => {
            const cartItem = cartItems.find((i: any) => i.product?.id === productId);
            if (!cartItem) return;
            const res = await fetch(`/api/cart/${cartItem.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ quantity }),
            });
            if (!res.ok) throw new Error("Failed to update cart");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
        },
    });

    const removeFromCartMutation = useMutation({
        mutationFn: async (productId: number) => {
            const cartItem = cartItems.find((i: any) => i.product?.id === productId);
            if (!cartItem) return;
            const res = await fetch(`/api/cart/${cartItem.id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to remove from cart");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
        },
    });

    const handleIncrement = (productId: number) => {
        const qty = getCartQuantity(productId);
        updateCartMutation.mutate({ productId, quantity: qty + 1 });
    };

    const handleDecrement = (productId: number) => {
        const qty = getCartQuantity(productId);
        if (qty === 1) {
            removeFromCartMutation.mutate(productId);
        } else {
            updateCartMutation.mutate({ productId, quantity: qty - 1 });
        }
    };

    // Loading State
    if (isLoading) {
        return (
            <div className="min-h-[70vh] lg:min-h-[80vh] flex flex-col items-center justify-center gap-4 page-transition">
                <div className="relative">
                    <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/20 rounded-full flex items-center justify-center shadow-xl">
                        <Heart className="w-12 h-12 lg:w-16 lg:h-16 text-red-400 animate-pulse" />
                    </div>
                    <Loader2 className="absolute bottom-0 right-0 w-8 h-8 text-red-500 animate-spin" />
                </div>
                <p className="text-muted-foreground animate-pulse text-lg">
                    {isRTL ? 'جاري التحميل...' : 'Loading your favorites...'}
                </p>
            </div>
        );
    }

    // Empty State
    if (wishlistItems.length === 0) {
        return (
            <div className="min-h-[70vh] lg:min-h-[80vh] flex flex-col items-center justify-center p-6 text-center page-transition">
                <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/20 rounded-full flex items-center justify-center mb-6 shadow-xl">
                    <Heart className="w-12 h-12 lg:w-16 lg:h-16 text-red-300" />
                </div>
                <h2 className="text-2xl lg:text-4xl font-bold mb-3">
                    {isRTL ? 'قائمة المفضلة فارغة' : 'Your wishlist is empty'}
                </h2>
                <p className="text-muted-foreground mb-8 text-sm lg:text-lg max-w-md">
                    {isRTL
                        ? 'اضغط على ❤️ لحفظ منتجاتك المفضلة والعودة إليها لاحقاً'
                        : 'Tap the ❤️ on products to save them for later'}
                </p>
                <Button asChild size="lg" className="h-12 lg:h-14 px-8 lg:px-12 rounded-full shadow-xl text-base lg:text-lg">
                    <Link href="/">
                        <ShoppingBag className="w-5 h-5 me-2" />
                        {isRTL ? 'تصفح المنتجات' : 'Browse Products'}
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background page-transition">
            {/* Header */}
            <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-xl border-b shadow-sm w-full">
                <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-4 lg:py-5">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 lg:p-3 bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/20 rounded-xl">
                            <Heart className="w-6 h-6 lg:w-7 lg:h-7 text-red-500 fill-red-500" />
                        </div>
                        <div>
                            <h1 className="text-xl lg:text-3xl font-bold">{isRTL ? 'المفضلة' : 'My Wishlist'}</h1>
                            <p className="text-sm text-muted-foreground hidden lg:block">
                                {wishlistItems.length} {isRTL ? 'منتج محفوظ' : 'saved items'}
                            </p>
                        </div>
                        <Badge variant="secondary" className="lg:hidden text-sm px-3 py-1 rounded-full ms-auto bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            {wishlistItems.length}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-6 lg:py-10 pb-24 lg:pb-8">
                <div className="lg:grid lg:grid-cols-12 lg:gap-10">
                    {/* Products Grid - Main Column */}
                    <div className="lg:col-span-8">
                        <div className="grid grid-cols-3 gap-3 lg:gap-5">
                            {wishlistItems.map((item) => {
                                const cartQty = getCartQuantity(item.productId);
                                const isOutOfStock = !item.product.isAvailable;

                                return (
                                    <Card
                                        key={item.id}
                                        className={cn(
                                            "group relative overflow-hidden border-0 bg-white dark:bg-slate-900 rounded-2xl transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg",
                                            "hover:-translate-y-1 active:scale-[0.98]",
                                            isOutOfStock && "opacity-80"
                                        )}
                                        onClick={() => setSelectedProduct(item.product as unknown as Product)}
                                    >
                                        {/* Product Image */}
                                        <div className="relative aspect-square overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                                                {(item.product.imageUrl?.startsWith('http') || item.product.imageUrl?.startsWith('/')) ? (
                                                    <img
                                                        src={item.product.imageUrl}
                                                        alt={getProductName(item.product)}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-5xl">
                                                        {item.product.imageUrl || <Package className="w-14 h-14 text-slate-300" />}
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

                                            {/* Remove from Wishlist Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeFromWishlistMutation.mutate(item.productId);
                                                }}
                                                className={cn(
                                                    "absolute top-2 h-8 w-8 flex items-center justify-center rounded-full",
                                                    "bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-sm",
                                                    "hover:bg-red-100 hover:text-red-600 active:scale-90 transition-all",
                                                    isRTL ? "left-2" : "right-2"
                                                )}
                                                disabled={removeFromWishlistMutation.isPending}
                                            >
                                                {removeFromWishlistMutation.isPending ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </button>

                                            {/* Wishlist Heart Indicator */}
                                            <div className={cn(
                                                "absolute top-2 bg-white/90 dark:bg-slate-900/90 rounded-full p-1.5 shadow-sm",
                                                isRTL ? "right-2" : "left-2"
                                            )}>
                                                <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                                            </div>
                                        </div>

                                        {/* Content Section */}
                                        <div className="p-3 space-y-2">
                                            {/* Product Name */}
                                            <h3 className={cn(
                                                "font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5rem]",
                                                "group-hover:text-primary transition-colors",
                                                isRTL ? "text-right" : "text-left"
                                            )}>
                                                {getProductName(item.product)}
                                            </h3>

                                            {/* Price Row */}
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-lg font-bold text-primary">
                                                    {item.product.price}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {isRTL ? 'جنيه' : 'EGP'}
                                                </span>
                                                {item.product.originalPrice && parseFloat(item.product.originalPrice) > parseFloat(item.product.price) && (
                                                    <span className="text-xs text-muted-foreground line-through ml-auto rtl:mr-auto rtl:ml-0">
                                                        {item.product.originalPrice}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Action Button */}
                                            <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                                                {isOutOfStock ? (
                                                    <Badge variant="secondary" className="w-full justify-center text-xs py-2 bg-muted/50">
                                                        {isRTL ? 'غير متوفر حالياً' : 'Currently Unavailable'}
                                                    </Badge>
                                                ) : cartQty === 0 ? (
                                                    <Button
                                                        className="w-full h-10 rounded-xl text-sm font-medium gap-2 shadow-sm hover:shadow-md transition-all"
                                                        onClick={() => addToCartMutation.mutate(item.productId)}
                                                        disabled={addToCartMutation.isPending}
                                                    >
                                                        {addToCartMutation.isPending ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <ShoppingCart className="w-4 h-4" />
                                                                {isRTL ? 'أضف' : 'Add'}
                                                            </>
                                                        )}
                                                    </Button>
                                                ) : (
                                                    <div className="flex items-center justify-between bg-primary rounded-xl h-10 px-1 shadow-sm">
                                                        <button
                                                            onClick={() => handleDecrement(item.productId)}
                                                            className="w-8 h-8 flex items-center justify-center text-primary-foreground hover:bg-white/20 rounded-lg transition-colors active:scale-90"
                                                            disabled={updateCartMutation.isPending || removeFromCartMutation.isPending}
                                                        >
                                                            <span className="text-lg font-bold">−</span>
                                                        </button>
                                                        <span className="text-sm font-bold text-primary-foreground min-w-[2rem] text-center">
                                                            {cartQty}
                                                        </span>
                                                        <button
                                                            onClick={() => handleIncrement(item.productId)}
                                                            className="w-8 h-8 flex items-center justify-center text-primary-foreground hover:bg-white/20 rounded-lg transition-colors active:scale-90"
                                                            disabled={updateCartMutation.isPending}
                                                        >
                                                            <span className="text-lg font-bold">+</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    {/* Desktop Sidebar */}
                    <div className="hidden lg:block lg:col-span-4">
                        <div className="sticky top-28 space-y-6">
                            {/* Wishlist Summary Card */}
                            <Card className="p-8 border-0 shadow-2xl bg-white dark:bg-slate-900 rounded-3xl">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/20 rounded-2xl">
                                        <Heart className="w-7 h-7 text-red-500 fill-red-500" />
                                    </div>
                                    <h2 className="text-2xl font-bold">{isRTL ? 'ملخص المفضلة' : 'Wishlist Summary'}</h2>
                                </div>

                                <div className="space-y-5 mb-8">
                                    <div className="flex justify-between text-base">
                                        <span className="text-muted-foreground">{isRTL ? 'عدد المنتجات' : 'Total Items'}</span>
                                        <span className="font-semibold">{wishlistItems.length}</span>
                                    </div>
                                    <div className="flex justify-between text-base">
                                        <span className="text-muted-foreground">{isRTL ? 'متاح الآن' : 'Available'}</span>
                                        <span className="font-semibold text-green-600">
                                            {wishlistItems.filter(i => i.product.isAvailable).length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-base">
                                        <span className="text-muted-foreground">{isRTL ? 'نفذ المخزون' : 'Out of Stock'}</span>
                                        <span className="font-semibold text-red-500">
                                            {wishlistItems.filter(i => !i.product.isAvailable).length}
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-14 text-lg font-semibold shadow-xl hover:shadow-primary/30 transition-all rounded-2xl"
                                    onClick={() => {
                                        const availableItems = wishlistItems.filter(i => i.product.isAvailable);
                                        availableItems.forEach(item => {
                                            addToCartMutation.mutate(item.productId);
                                        });
                                    }}
                                    disabled={addToCartMutation.isPending || wishlistItems.filter(i => i.product.isAvailable).length === 0}
                                >
                                    <ShoppingCart className="w-5 h-5 me-2" />
                                    {isRTL ? 'أضف الكل للسلة' : 'Add All to Cart'}
                                </Button>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom CTA */}
            <div className="lg:hidden fixed bottom-16 left-0 right-0 p-4 bg-background/80 backdrop-blur-3xl border-t border-white/20 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] z-50 safe-area-pb">
                <Button
                    className="w-full h-12 text-base font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                    onClick={() => setLocation('/')}
                >
                    <ShoppingBag className="w-5 h-5 me-2" />
                    {isRTL ? 'استمر بالتسوق' : 'Continue Shopping'}
                </Button>
            </div>

            {/* Product Details Modal/Drawer */}
            {isMobile ? (
                <Drawer open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
                    <DrawerContent className="max-h-[90vh]">
                        <div className="overflow-y-auto p-6">
                            {selectedProduct && <ProductDetailsContent
                                product={selectedProduct}
                                getCartQuantity={getCartQuantity}
                                handleAddToCart={(id) => addToCartMutation.mutate(id)}
                                handleIncrement={handleIncrement}
                                handleDecrement={handleDecrement}
                                handleNotifyMe={() => { }}
                                notifiedProducts={new Set()}
                                isRTL={isRTL}
                                t={t}
                                isNotifyPending={false}
                                isAddPending={addToCartMutation.isPending}
                            />}
                        </div>
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
                    <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden">
                        {selectedProduct && <ProductDetailsContent
                            product={selectedProduct}
                            getCartQuantity={getCartQuantity}
                            handleAddToCart={(id) => addToCartMutation.mutate(id)}
                            handleIncrement={handleIncrement}
                            handleDecrement={handleDecrement}
                            handleNotifyMe={() => { }}
                            notifiedProducts={new Set()}
                            isRTL={isRTL}
                            t={t}
                            isNotifyPending={false}
                            isAddPending={addToCartMutation.isPending}
                        />}
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
