import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Bell, ShoppingCart, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { translateContent } from "@/lib/translator";
import i18n from "@/lib/i18n";
import type { Product } from "@shared/schema";

interface ProductDetailsContentProps {
    product: Product;
    getCartQuantity: (productId: number) => number;
    handleAddToCart: (productId: number) => void;
    handleIncrement: (productId: number) => void;
    handleDecrement: (productId: number) => void;
    handleNotifyMe: (productId: number) => void;
    notifiedProducts: Set<number>;
    isRTL: boolean;
    t: (key: string) => string;
    isNotifyPending?: boolean;
    isAddPending?: boolean;
}

export const ProductDetailsContent = ({
    product,
    getCartQuantity,
    handleAddToCart,
    handleIncrement,
    handleDecrement,
    handleNotifyMe,
    notifiedProducts,
    isRTL,
    t,
    isNotifyPending = false,
    isAddPending = false,
}: ProductDetailsContentProps) => {
    const quantity = getCartQuantity(product.id);
    const isOutOfStock = !product.isAvailable || product.stock === 0;

    const getProductName = (product: Product) => {
        if (i18n.language === 'en' && product.englishName) {
            return product.englishName;
        }
        return translateContent(product.name, i18n.language);
    };

    const getProductDescription = (product: Product) => {
        if (i18n.language === 'en' && product.englishDescription) {
            return product.englishDescription;
        }
        return translateContent(product.description || "", i18n.language);
    };

    return (
        <div>
            {/* Product Image */}
            <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                {(product.imageUrl?.startsWith('http') || product.imageUrl?.startsWith('/')) ? (
                    <img
                        src={product.imageUrl}
                        alt={getProductName(product)}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-8xl">
                        {product.imageUrl || <Package className="w-24 h-24 text-slate-300" />}
                    </div>
                )}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <Badge variant="destructive" className="text-lg font-bold px-6 py-2 shadow-lg">
                            {t('out_of_stock')}
                        </Badge>
                    </div>
                )}
            </div>

            {/* Product Info */}
            <div className="p-6 space-y-4">
                <div>
                    <h2 className={cn("text-2xl font-bold", isRTL && "text-right")}>
                        {getProductName(product)}
                    </h2>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-primary">{product.price}</span>
                    <span className="text-lg text-muted-foreground">{isRTL ? 'جنيه' : 'EGP'}</span>
                    <span className="text-sm text-muted-foreground ml-auto rtl:mr-auto rtl:ml-0">/ {t(product.unit as any)}</span>
                </div>

                {/* Stock Status */}
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        isOutOfStock ? "bg-red-500" : (product.stock || 0) < 10 ? "bg-amber-500" : "bg-green-500"
                    )} />
                    <span className="text-sm text-muted-foreground">
                        {isOutOfStock
                            ? (isRTL ? 'غير متوفر' : 'Out of Stock')
                            : (product.stock || 0) < 10
                                ? (isRTL ? `${product.stock} فقط متبقي` : `Only ${product.stock} left`)
                                : (isRTL ? 'متوفر' : 'In Stock')
                        }
                    </span>
                </div>

                {/* Description */}
                {getProductDescription(product) && (
                    <div className="pt-2 border-t">
                        <h3 className={cn("font-semibold mb-2", isRTL && "text-right")}>
                            {isRTL ? 'الوصف' : 'Description'}
                        </h3>
                        <p className={cn("text-muted-foreground text-sm leading-relaxed", isRTL && "text-right")}>
                            {getProductDescription(product)}
                        </p>
                    </div>
                )}

                {/* Action Button */}
                <div className="pt-4">
                    {isOutOfStock ? (
                        notifiedProducts.has(product.id) ? (
                            <Button
                                variant="secondary"
                                className="w-full h-14 text-lg font-semibold rounded-2xl gap-2 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 opacity-80 cursor-default"
                                disabled
                            >
                                <Bell className="w-5 h-5" />
                                {isRTL ? 'سنعلمك عند التوفر' : "We'll notify you"}
                            </Button>
                        ) : (
                            <Button
                                variant="secondary"
                                className="w-full h-14 text-lg font-semibold rounded-2xl gap-2 border border-amber-200 dark:border-amber-900/50 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:text-amber-400"
                                onClick={() => handleNotifyMe(product.id)}
                                disabled={isNotifyPending}
                            >
                                <Bell className="w-5 h-5" />
                                {isRTL ? 'أعلمني عند التوفر' : 'Notify Me'}
                            </Button>
                        )
                    ) : quantity === 0 ? (
                        <Button
                            className="w-full h-14 text-lg font-semibold rounded-2xl gap-2 shadow-lg hover:shadow-xl transition-all"
                            onClick={() => handleAddToCart(product.id)}
                            disabled={isAddPending}
                        >
                            <ShoppingCart className="w-5 h-5" />
                            {isRTL ? 'أضف للسلة' : 'Add to Cart'}
                        </Button>
                    ) : (
                        <div className="flex items-center justify-between bg-primary/10 rounded-2xl p-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-12 w-12 rounded-xl hover:bg-white dark:hover:bg-slate-800 shadow-sm"
                                onClick={() => handleDecrement(product.id)}
                            >
                                <Minus className="w-5 h-5" />
                            </Button>
                            <span className="font-bold text-xl text-primary min-w-[3rem] text-center">
                                {quantity}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-12 w-12 rounded-xl hover:bg-white dark:hover:bg-slate-800 shadow-sm"
                                onClick={() => handleIncrement(product.id)}
                            >
                                <Plus className="w-5 h-5" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
