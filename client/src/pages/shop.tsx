import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Search, ShoppingCart, Plus, Minus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import i18n from "@/lib/i18n";
import type { Product, Category } from "@shared/schema";
import { translateContent } from "@/lib/translator";

export default function Shop() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: products = [], isLoading: isProductsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", selectedCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append("categoryId", selectedCategory.toString());
      if (searchQuery) params.append("search", searchQuery);
      const res = await fetch(`/api/products${params.toString() ? "?" + params.toString() : ""}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const { data: cartItems = [] } = useQuery<any[]>({
    queryKey: ["/api/cart"],
    retry: false,
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
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/cart"] });
      const previousCart = queryClient.getQueryData(["/api/cart"]);

      queryClient.setQueryData(["/api/cart"], (old: any[] = []) => {
        const existingItem = old.find((item) => item.productId === productId);
        if (existingItem) {
          return old.map((item) =>
            item.productId === productId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        // Mock new item for optimistic update
        const product = products.find(p => p.id === productId);
        return [...old, {
          id: Math.random(), // Temp ID
          productId,
          quantity: 1,
          product
        }];
      });

      return { previousCart };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      // Toast removed as requested
    },
    onError: (error: Error, variables, context: any) => {
      if (context?.previousCart) {
        queryClient.setQueryData(["/api/cart"], context.previousCart);
      }
      if (isUnauthorizedError(error)) {
        toast({
          title: "Please log in",
          description: "You need to log in to add items to cart",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ cartItemId, quantity }: { cartItemId: number; quantity: number }) => {
      const res = await fetch(`/api/cart/${cartItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) throw new Error("Failed to update quantity");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async ({ cartItemId, productName }: { cartItemId: number; productName: string }) => {
      const res = await fetch(`/api/cart/${cartItemId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove item");
      return productName;
    },
    onSuccess: (productName) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: t('removed_from_cart'),
        description: `${productName} ${t('has_been_removed')}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove item from cart",
        variant: "destructive",
      });
    },
  });

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
          alt={translateContent(product.name, i18n.language)}
          className="w-full h-full object-cover rounded-lg"
        />
      </div>
      <div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">{t('price')}:</span>
            <span className="text-2xl font-bold text-primary" data-testid="text-modal-price">
              {product.price}<span className="text-sm font-normal align-top mr-1">{i18n.language === 'ar' ? 'جنيه' : 'EGP'}</span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">{t('unit')}:</span>
            <span data-testid="text-modal-unit">{t(product.unit as any)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">{t('availability')}:</span>
            <Badge variant={product.isAvailable ? "default" : "secondary"}>
              {product.isAvailable ? t('in_stock') : t('out_of_stock')}
            </Badge>
          </div>
        </div>
      </div>
      {getCartQuantity(product.id) === 0 ? (
        <Button
          className="w-full"
          onClick={() => {
            addToCartMutation.mutate(product.id);
            if (!isMobile) setSelectedProduct(null);
          }}
          disabled={!product.isAvailable || addToCartMutation.isPending}
          data-testid="button-modal-add-to-cart"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {t('add_to_cart')}
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const cartItem = getCartItem(product.id);
              if (cartItem && getCartQuantity(product.id) > 1) {
                updateQuantityMutation.mutate({
                  cartItemId: cartItem.id,
                  quantity: getCartQuantity(product.id) - 1,
                });
              } else if (cartItem) {
                removeFromCartMutation.mutate(cartItem.id);
              }
            }}
            disabled={updateQuantityMutation.isPending || removeFromCartMutation.isPending}
            data-testid="button-modal-decrease-quantity"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span className="flex-1 text-center font-semibold" data-testid="text-modal-quantity">
            {getCartQuantity(product.id)} {t('in_cart')}
          </span>
          <Button
            variant="outline"
            onClick={() => {
              const cartItem = getCartItem(product.id);
              if (cartItem) {
                updateQuantityMutation.mutate({
                  cartItemId: cartItem.id,
                  quantity: getCartQuantity(product.id) + 1,
                });
              }
            }}
            disabled={updateQuantityMutation.isPending}
            data-testid="button-modal-increase-quantity"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-sm sm:text-base"
            data-testid="input-search"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap overflow-x-auto pb-2">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          onClick={() => setSelectedCategory(null)}
          data-testid="button-category-all"
          className="text-sm whitespace-nowrap flex-shrink-0"
        >
          {t('all_categories')}
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            onClick={() => setSelectedCategory(category.id)}
            data-testid={`button-category-${category.id}`}
            className="text-sm whitespace-nowrap flex-shrink-0 px-4"
          >
            {translateContent(category.name, i18n.language)}
          </Button>
        ))}
      </div>

      {isProductsLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-center space-y-3">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground">{t('loading_products')}</p>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">{t('no_products')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
          {products.map((product) => {
            const quantity = getCartQuantity(product.id);
            const cartItem = getCartItem(product.id);
            return (
              <Card
                key={product.id}
                className="p-2 sm:p-3 lg:p-4 hover:shadow-md transition-shadow flex flex-col active:shadow-sm bg-white dark:bg-slate-950 border border-border"
                data-testid={`card-product-${product.id}`}
              >
                <button
                  onClick={() => setSelectedProduct(product)}
                  className="w-full mb-2 sm:mb-3 hover:opacity-70 transition-opacity cursor-pointer active:scale-95 flex-shrink-0"
                  data-testid={`button-product-details-${product.id}`}
                >
                  <img
                    src={product.imageUrl || undefined}
                    alt={translateContent(product.name, i18n.language)}
                    className="w-full h-32 sm:h-48 object-cover rounded-md"
                  />
                </button>
                <button
                  onClick={() => setSelectedProduct(product)}
                  className="text-left hover:text-primary transition-colors flex-shrink-0"
                  data-testid={`text-product-name-${product.id}`}
                >
                  <h3 className="font-semibold text-xs sm:text-sm lg:text-base mb-1 line-clamp-2 leading-tight">{translateContent(product.name, i18n.language)}</h3>
                </button>
                <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground mb-2 line-clamp-2 flex-shrink-0">
                  {product.description}
                </p>
                <div className="flex items-center justify-between mb-2 gap-2 flex-shrink-0">
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold text-primary" data-testid={`text-price-${product.id}`}>
                    {product.price}<span className="text-xs sm:text-sm font-normal align-top mr-1">{i18n.language === 'ar' ? 'جنيه' : 'EGP'}</span>
                  </span>
                  <Badge variant={product.isAvailable ? "default" : "secondary"} className="text-[10px] sm:text-xs lg:text-sm whitespace-nowrap">
                    {t(product.unit as any)}
                  </Badge>
                </div>
                {quantity === 0 ? (
                  <Button
                    className="w-full mt-auto text-xs sm:text-sm lg:text-base h-8 sm:h-9 lg:h-10"
                    onClick={() => addToCartMutation.mutate(product.id)}
                    disabled={!product.isAvailable || addToCartMutation.isPending}
                    data-testid={`button-add-to-cart-${product.id}`}
                  >
                    <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">{product.isAvailable ? t('add') : t('out')}</span>
                    <span className="sm:hidden">{product.isAvailable ? "+" : "✕"}</span>
                  </Button>
                ) : (
                  <div className="flex items-center gap-1 mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 p-0 flex items-center justify-center flex-shrink-0"
                      onClick={() => {
                        if (cartItem && quantity > 1) {
                          updateQuantityMutation.mutate({
                            cartItemId: cartItem.id,
                            quantity: quantity - 1,
                          });
                        } else if (cartItem) {
                          removeFromCartMutation.mutate(cartItem.id);
                        }
                      }}
                      disabled={updateQuantityMutation.isPending || removeFromCartMutation.isPending}
                      data-testid={`button-decrease-quantity-${product.id}`}
                    >
                      <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                    <span className="flex-1 text-center font-semibold text-xs sm:text-sm lg:text-base" data-testid={`text-quantity-${product.id}`}>
                      {quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 p-0 flex items-center justify-center flex-shrink-0"
                      onClick={() => {
                        if (cartItem) {
                          updateQuantityMutation.mutate({
                            cartItemId: cartItem.id,
                            quantity: quantity + 1,
                          });
                        }
                      }}
                      disabled={updateQuantityMutation.isPending}
                      data-testid={`button-increase-quantity-${product.id}`}
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {isMobile ? (
        <Drawer open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>{selectedProduct && translateContent(selectedProduct.name, i18n.language)}</DrawerTitle>
              <DrawerDescription>
                {selectedProduct && translateContent(selectedProduct.description || "", i18n.language)}
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
              <DialogTitle className="text-2xl">{selectedProduct && translateContent(selectedProduct.name, i18n.language)}</DialogTitle>
              <DialogDescription className="text-base mb-4">
                {selectedProduct && translateContent(selectedProduct.description || "", i18n.language)}
              </DialogDescription>
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                data-testid="button-close-product-details"
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
