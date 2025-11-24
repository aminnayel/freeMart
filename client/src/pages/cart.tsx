import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Trash2, ShoppingBag, ShoppingCart, Plus, Minus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import i18n from "@/lib/i18n";
import type { Product } from "@shared/schema";

export default function Cart() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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
        title: "Error",
        description: "Failed to update cart",
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: t('removed_from_cart'),
        description: t('item_removed_description'),
      });
    },
  });

  const total = cartItems.reduce(
    (sum: number, item: any) => sum + parseFloat(item.product.price) * item.quantity,
    0
  );

  const getCartItem = (productId: number) => {
    return cartItems.find((item: any) => item.productId === productId);
  };

  const getCartQuantity = (productId: number) => {
    const item = getCartItem(productId);
    return item?.quantity || 0;
  };

  const ProductDetailsContent = ({ product }: { product: Product }) => (
    <div className="space-y-4">
      <div className="w-full h-64 sm:h-80 relative">
        <img
          src={product.imageUrl || undefined}
          alt={product.name}
          className="w-full h-full object-cover rounded-lg"
        />
      </div>
      <div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">{t('price')}:</span>
            <span className="text-2xl font-bold text-primary">
              {product.price}<span className="text-sm font-normal align-top mr-1">{i18n.language === 'ar' ? 'جنيه' : 'EGP'}</span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">{t('unit')}:</span>
            <span>{t(product.unit as any)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">{t('availability')}:</span>
            <Badge variant={product.isAvailable ? "default" : "secondary"}>
              {product.isAvailable ? t('in_stock') : t('out_of_stock')}
            </Badge>
          </div>
        </div>
      </div>
      {getCartQuantity(product.id) > 0 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const cartItem = getCartItem(product.id);
              if (cartItem && getCartQuantity(product.id) > 1) {
                updateCartMutation.mutate({
                  id: cartItem.id,
                  quantity: getCartQuantity(product.id) - 1,
                });
              } else if (cartItem) {
                removeFromCartMutation.mutate(cartItem.id);
              }
            }}
            disabled={updateCartMutation.isPending || removeFromCartMutation.isPending}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span className="flex-1 text-center font-semibold">
            {getCartQuantity(product.id)} {t('in_cart')}
          </span>
          <Button
            variant="outline"
            onClick={() => {
              const cartItem = getCartItem(product.id);
              if (cartItem) {
                updateCartMutation.mutate({
                  id: cartItem.id,
                  quantity: getCartQuantity(product.id) + 1,
                });
              }
            }}
            disabled={updateCartMutation.isPending}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingBag className="w-24 h-24 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">{t('cart_empty')}</h2>
        <p className="text-muted-foreground mb-6">{t('cart_empty_desc')}</p>
        <Button asChild data-testid="button-shop-now">
          <Link href="/">{t('shop_now')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4">
      <h1 className="text-2xl sm:text-3xl font-bold">{t('shopping_cart')}</h1>

      <div className="space-y-3 sm:space-y-4">
        {cartItems.map((item: any) => (
          <Card key={item.id} className="p-3 sm:p-4" data-testid={`cart-item-${item.id}`}>
            {/* Top Row: Product Info Left, Quantity Controls Right */}
            <div className="flex items-center justify-between gap-3 sm:gap-4 mb-2">
              {/* Product Info Left */}
              <div className="flex gap-3 flex-1 min-w-0">
                <button
                  onClick={() => setSelectedProduct(item.product)}
                  className="flex-shrink-0 hover:opacity-70 transition-opacity cursor-pointer"
                >
                  <img
                    src={item.product.imageUrl || undefined}
                    alt={item.product.name}
                    className="w-16 sm:w-20 h-full object-cover rounded-md"
                  />
                </button>
                <div className="flex-1 min-w-0 flex flex-col">
                  <button
                    onClick={() => setSelectedProduct(item.product)}
                    className="text-left hover:text-primary transition-colors w-full text-right"
                  >
                    <h3 className="font-semibold text-sm sm:text-base truncate" data-testid={`text-cart-item-name-${item.id}`}>
                      {item.product.name}
                    </h3>
                  </button>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t(item.product.unit as any)}</p>
                  <p className="text-base sm:text-lg font-bold text-primary mt-1">
                    {item.product.price}<span className="text-xs sm:text-sm font-normal align-top mr-1">{i18n.language === 'ar' ? 'جنيه' : 'EGP'}</span>
                  </p>
                </div>
              </div>

              {/* Quantity Controls Right */}
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 active:scale-95 transition-transform"
                  onClick={() =>
                    updateCartMutation.mutate({
                      id: item.id,
                      quantity: Math.max(1, item.quantity - 1),
                    })
                  }
                  data-testid={`button-decrease-${item.id}`}
                >
                  −
                </Button>
                <span className="text-sm sm:text-base font-semibold w-8 text-center" data-testid={`text-quantity-${item.id}`}>
                  {item.quantity}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 active:scale-95 transition-transform"
                  onClick={() =>
                    updateCartMutation.mutate({
                      id: item.id,
                      quantity: item.quantity + 1,
                    })
                  }
                  data-testid={`button-increase-${item.id}`}
                >
                  +
                </Button>
              </div>
            </div>

            {/* Bottom Row: Total Price and Delete Button */}
            <div className="flex items-center justify-end gap-2 sm:gap-3">
              <div className="text-right">
                <p className="text-sm sm:text-base font-bold whitespace-nowrap">
                  {(parseFloat(item.product.price) * item.quantity).toFixed(2)}<span className="text-xs font-normal align-top mr-1">{i18n.language === 'ar' ? 'جنيه' : 'EGP'}</span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 sm:h-9 sm:w-9 p-0 hover:bg-destructive/10"
                onClick={() => removeFromCartMutation.mutate(item.id)}
                data-testid={`button-remove-${item.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 sm:p-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-base sm:text-xl font-semibold">{t('total')}:</span>
            <span className="text-xl sm:text-2xl font-bold text-primary" data-testid="text-total">
              {total.toFixed(2)}<span className="text-sm sm:text-base font-normal align-top mr-1">{i18n.language === 'ar' ? 'جنيه' : 'EGP'}</span>
            </span>
          </div>
          <Button asChild className="w-full text-sm sm:text-base" size="lg" data-testid="button-checkout">
            <Link href="/checkout">{t('proceed_to_checkout')}</Link>
          </Button>
        </div>
      </Card>

      {/* Product Details Modal */}
      {isMobile ? (
        <Drawer open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>{selectedProduct?.name}</DrawerTitle>
              <DrawerDescription>
                {selectedProduct?.description}
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4 pb-8">
              {selectedProduct && <ProductDetailsContent product={selectedProduct} />}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
          <DialogContent className="overflow-y-auto max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedProduct?.name}</DialogTitle>
              <DialogDescription className="text-base mb-4">
                {selectedProduct?.description}
              </DialogDescription>
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </button>
            </DialogHeader>
            {selectedProduct && <ProductDetailsContent product={selectedProduct} />}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
