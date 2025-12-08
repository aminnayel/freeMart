import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Trash2, ShoppingBag, Plus, Minus, ArrowRight, Package, Shield, Truck, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import i18n from "@/lib/i18n";
import type { Product } from "@shared/schema";
import { translateContent } from "@/lib/translator";
import { useAuth } from "@/hooks/useAuth";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useLocation } from "wouter";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProductDetailsContent } from "@/components/shop/product-details-content";
import { Bell } from "lucide-react";
import { subscribeToPushNotifications } from "@/lib/push-notifications";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Cart() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { user } = useAuth();
  const { openLogin } = useAuthModal();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [notifiedProducts, setNotifiedProducts] = useState<Set<number>>(new Set());

  const getProductName = (product: Product) => {
    if (i18n.language === 'en' && product.englishName) {
      return product.englishName;
    }
    return translateContent(product.name, i18n.language);
  };

  const notifyMeMutation = useMutation({
    mutationFn: async (productId: number) => {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error("Failed to subscribe");
      return { ...await res.json(), productId };
    },
    onSuccess: (data) => {
      setNotifiedProducts(prev => new Set(prev).add(data.productId));
      if (data.message === "Already subscribed") {
        toast({ title: t('already_subscribed'), description: t('already_subscribed_desc') });
      } else {
        toast({ title: t('subscribed'), description: t('subscribed_desc') });
      }
    },
    onError: () => {
      toast({ title: t('error'), description: t('error_subscribe_notifications'), variant: "destructive" });
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
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`${res.status}: ${error}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      // We don't need to show a toast here as it's just adding back from the modal
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t('login_required'),
          description: t('login_to_add_cart'),
          variant: "destructive",
        });
        openLogin();
        return;
      }
      toast({ title: t('error'), description: t('error_add_cart'), variant: "destructive" });
    },
  });

  const getCartItem = (productId: number) => {
    return cartItems.find((item: any) => item.product.id === productId);
  };

  const getCartQuantity = (productId: number) => {
    const item = getCartItem(productId);
    return item?.quantity || 0;
  };

  const handleAddToCart = (productId: number) => {
    addToCartMutation.mutate(productId);
  };

  const handleIncrement = (productId: number) => {
    const cartItem = getCartItem(productId);
    if (cartItem) {
      updateCartMutation.mutate({ id: cartItem.id, quantity: cartItem.quantity + 1 });
    }
  };

  const handleDecrement = (productId: number) => {
    const cartItem = getCartItem(productId);
    if (cartItem) {
      if (cartItem.quantity === 1) {
        removeFromCartMutation.mutate(cartItem.id);
      } else {
        updateCartMutation.mutate({ id: cartItem.id, quantity: cartItem.quantity - 1 });
      }
    }
  };

  const handleNotifyMe = async (productId: number) => {
    if (!user) {
      toast({
        title: t('login_required'),
        description: t('login_to_notify'),
        variant: "destructive",
      });
      openLogin();
      return;
    }
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        const result = await Notification.requestPermission();
        if (result === "granted") {
          await subscribeToPushNotifications();
        }
      } else if (Notification.permission === "granted") {
        await subscribeToPushNotifications();
      } else if (Notification.permission === "denied") {
        toast({
          title: t('notifications_blocked'),
          description: t('enable_notifications_settings'),
          variant: "destructive",
        });
        return;
      }
    }
    notifyMeMutation.mutate(productId);
  };

  const { data: cartItems = [] } = useQuery<any[]>({
    queryKey: ["/api/cart"],
  });

  const updateCartMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: number; quantity: number }) => {
      const res = await fetch(`/api/cart/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) throw new Error("Failed to update cart");
      return res.json();
    },
    onMutate: async ({ id, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/cart"] });
      const previousCart = queryClient.getQueryData(["/api/cart"]);
      queryClient.setQueryData(["/api/cart"], (old: any[] = []) => {
        return old.map((item) =>
          item.id === id ? { ...item, quantity } : item
        );
      });
      return { previousCart };
    },
    onError: (err, newTodo, context: any) => {
      queryClient.setQueryData(["/api/cart"], context?.previousCart);
      toast({
        title: t('error'),
        description: t('error_update_cart'),
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/cart/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove item");
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["/api/cart"] });
      const previousCart = queryClient.getQueryData(["/api/cart"]);
      queryClient.setQueryData(["/api/cart"], (old: any[] = []) => {
        return old.filter((item) => item.id !== id);
      });
      return { previousCart };
    },
    onError: (err, id, context: any) => {
      queryClient.setQueryData(["/api/cart"], context?.previousCart);
      toast({
        title: t('error'),
        description: t('error_remove_item'),
        variant: "destructive",
      });
    },
    onSuccess: (id, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      const item = (context?.previousCart as any[])?.find(i => i.id === id);
      const productName = item ? getProductName(item.product) : t('item');
      toast({
        title: t('removed_from_cart'),
        description: `${productName} ${t('has_been_removed')}`,
      });
    },
  });

  const total = cartItems.reduce(
    (sum: number, item: any) => sum + parseFloat(item.product.price) * item.quantity,
    0
  );

  /* Fixed to calculate Varieties (items.length) instead of total sum of quantities */
  const totalItems = cartItems.length;

  // Empty Cart - Updated for desktop
  if (cartItems.length === 0) {
    return (
      <div className="min-h-[70vh] lg:min-h-[80vh] flex flex-col items-center justify-center p-6 text-center page-transition">
        <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mb-6 shadow-xl">
          <ShoppingBag className="w-12 h-12 lg:w-16 lg:h-16 text-primary" />
        </div>
        <h2 className="text-2xl lg:text-4xl font-bold mb-3">{t('cart_empty')}</h2>
        <p className="text-muted-foreground mb-8 text-sm lg:text-lg max-w-md">{t('cart_empty_desc')}</p>
        <Button asChild size="lg" className="h-12 lg:h-14 px-8 lg:px-12 rounded-full shadow-xl text-base lg:text-lg">
          <Link href="/">{t('shop_now')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background page-transition">
      {/* Header - Fixed below main navbar */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-xl border-b shadow-sm w-full">
        <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-4 lg:py-5">
          <div className="flex items-center gap-4">
            <div className="p-2.5 lg:p-3 bg-primary/10 rounded-xl">
              <ShoppingBag className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl lg:text-3xl font-bold">{t('shopping_cart')}</h1>
              <p className="text-sm text-muted-foreground hidden lg:block">
                {totalItems} {isRTL ? 'أصناف في سلتك' : 'items in your cart'}
              </p>
            </div>
            <Badge variant="secondary" className="lg:hidden text-sm px-3 py-1 rounded-full ms-auto">
              {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-6 lg:py-10">
        <div className="lg:grid lg:grid-cols-12 lg:gap-10">
          {/* Cart Items - Left Column (larger on desktop) */}
          {/* Cart Items - Left Column (larger on desktop) */}
          <div className="lg:col-span-8 space-y-3 lg:space-y-6 pb-40 lg:pb-8">
            <div className="hidden lg:flex items-center justify-between pb-4 border-b">
              <h2 className="text-lg font-semibold text-muted-foreground">
                {isRTL ? 'منتجاتك' : 'Your Items'}
              </h2>
              <span className="text-sm text-muted-foreground">{totalItems} {isRTL ? 'منتج' : 'items'}</span>
            </div>

            {cartItems.map((item: any, index) => (
              <Card
                key={item.id}
                className="border-0 shadow-md lg:shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-900 rounded-2xl lg:rounded-3xl overflow-hidden cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => setSelectedProduct(item.product)}
              >
                <div className="flex">
                  {/* Product Image - Full Height */}
                  <div
                    className="w-28 sm:w-32 lg:w-40 flex-shrink-0 overflow-hidden bg-gradient-to-br from-muted to-muted/50 relative"
                  >
                    {(item.product.imageUrl?.startsWith('http') || item.product.imageUrl?.startsWith('/')) ? (
                      <img
                        src={item.product.imageUrl}
                        alt={getProductName(item.product)}
                        className="w-full h-full object-cover min-h-[120px] lg:min-h-[140px]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted/50 text-4xl lg:text-5xl min-h-[120px] lg:min-h-[140px]">
                        {item.product.imageUrl || <Package className="w-10 h-10 lg:w-12 lg:h-12 text-muted-foreground" />}
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0 p-4 lg:p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-sm lg:text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                            {getProductName(item.product)}
                          </h3>
                          <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">{t(item.product.unit as any)}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromCartMutation.mutate(item.id);
                          }}
                          className="p-1.5 -mt-1 -me-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4 lg:w-5 lg:h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 lg:mt-4">
                      {/* Quantity Controls */}
                      <div
                        className="flex items-center gap-2 bg-primary/10 rounded-xl p-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.quantity > 1) {
                              updateCartMutation.mutate({ id: item.id, quantity: item.quantity - 1 });
                            } else {
                              removeFromCartMutation.mutate(item.id);
                            }
                          }}
                          className="h-8 w-8 lg:h-10 lg:w-10 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 shadow-sm hover:shadow-md active:scale-95 transition-all"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-bold w-8 lg:w-10 text-center text-base lg:text-lg text-primary">{item.quantity}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCartMutation.mutate({ id: item.id, quantity: item.quantity + 1 });
                          }}
                          className="h-8 w-8 lg:h-10 lg:w-10 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 shadow-sm hover:shadow-md active:scale-95 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-end">
                        <p className="font-bold text-primary text-lg lg:text-xl">
                          {(parseFloat(item.product.price) * item.quantity).toFixed(0)}
                          <span className="text-xs lg:text-sm font-medium ms-1">{isRTL ? 'جنيه' : 'EGP'}</span>
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-[10px] lg:text-xs text-muted-foreground">
                            {item.product.price} × {item.quantity}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Order Summary - Right Sidebar */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-28 space-y-6">
              {/* Order Summary Card */}
              <Card className="p-8 border-0 shadow-2xl bg-white dark:bg-slate-900 rounded-3xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl">
                    <ShoppingBag className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">{t('order_summary') || 'Order Summary'}</h2>
                </div>

                <div className="space-y-5 mb-8">
                  <div className="flex justify-between text-base">
                    <span className="text-muted-foreground">{t('subtotal')} ({totalItems} {isRTL ? 'منتج' : 'items'})</span>
                    <span className="font-semibold">{total.toFixed(0)} {isRTL ? 'جنيه' : 'EGP'}</span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-muted-foreground">{t('shipping')}</span>
                    <span className="text-green-600 font-semibold">{t('free')}</span>
                  </div>
                  <div className="border-t-2 border-dashed pt-5 flex justify-between">
                    <span className="text-xl font-bold">{t('total')}</span>
                    <span className="text-2xl font-bold text-primary">
                      {total.toFixed(0)} <span className="text-base font-medium">{isRTL ? 'جنيه' : 'EGP'}</span>
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full h-14 text-lg font-semibold shadow-xl hover:shadow-primary/30 transition-all rounded-2xl group"
                  onClick={() => {
                    if (!user) openLogin('/checkout');
                    else setLocation('/checkout');
                  }}
                >
                  {t('checkout')}
                  <ArrowRight className={`w-6 h-6 ms-3 group-hover:translate-x-2 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-2' : ''}`} />
                </Button>
              </Card>

              {/* Trust Badges */}
              <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-muted/50 to-muted/20 rounded-2xl">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-2">
                    <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                      <Truck className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-xs font-medium">{isRTL ? 'توصيل مجاني' : 'Free Delivery'}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-xs font-medium">{isRTL ? 'شراء آمن' : 'Secure'}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="text-xs font-medium">{isRTL ? 'دفع سهل' : 'Easy Pay'}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Checkout Bar */}
      {/* Mobile Fixed Bottom Checkout Bar - Compact */}
      {/* Mobile Fixed Bottom Checkout Bar - Polished */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 p-4 bg-background/80 backdrop-blur-3xl border-t border-white/20 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] z-50 safe-area-pb">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">{t('total')}</span>
            <span className="text-xl font-bold text-primary">
              {total.toFixed(0)} <span className="text-sm font-medium">{isRTL ? 'جنيه' : 'EGP'}</span>
            </span>
          </div>
          <Button
            className="flex-1 h-12 text-base font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground"
            onClick={() => {
              if (!user) openLogin('/checkout');
              else setLocation('/checkout');
            }}
          >
            {t('checkout')}
            <ArrowRight className={`w-5 h-5 ms-2 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Product Details Drawer */}
      {/* Product Details Modal/Drawer */}
      {isMobile ? (
        <Drawer open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
          <DrawerContent className="max-h-[90vh]">
            <div className="overflow-y-auto p-6">
              {selectedProduct && <ProductDetailsContent
                product={selectedProduct}
                getCartQuantity={getCartQuantity}
                handleAddToCart={handleAddToCart}
                handleIncrement={handleIncrement}
                handleDecrement={handleDecrement}
                handleNotifyMe={handleNotifyMe}
                notifiedProducts={notifiedProducts}
                isRTL={isRTL}
                t={t}
                isNotifyPending={notifyMeMutation.isPending}
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
              handleAddToCart={handleAddToCart}
              handleIncrement={handleIncrement}
              handleDecrement={handleDecrement}
              handleNotifyMe={handleNotifyMe}
              notifiedProducts={notifiedProducts}
              isRTL={isRTL}
              t={t}
              isNotifyPending={notifyMeMutation.isPending}
              isAddPending={addToCartMutation.isPending}
            />}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
