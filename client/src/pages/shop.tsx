import { useState, useEffect } from "react";
import { subscribeToPushNotifications } from "@/lib/push-notifications";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Search, ShoppingCart, Plus, Minus, X, Bell, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import i18n from "@/lib/i18n";
import type { Product, Category } from "@shared/schema";
import { translateContent } from "@/lib/translator";
import { useAuth } from "@/hooks/useAuth";

export default function Shop() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: products = [], isLoading: isProductsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", selectedCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      // Only filter by category if NOT searching
      if (selectedCategory && !searchQuery) params.append("categoryId", selectedCategory.toString());
      if (searchQuery) params.append("search", searchQuery);
      const res = await fetch(`/api/products${params.toString() ? "?" + params.toString() : ""}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  // Handle direct product links from notifications (Deep Linking)
  // Handle direct product links from notifications (Deep Linking)
  const params = new URLSearchParams(window.location.search);
  const productIdFromUrl = params.get('product_id') || params.get('id');

  const { data: directProduct } = useQuery<Product>({
    queryKey: ["/api/products", productIdFromUrl],
    queryFn: async () => {
      if (!productIdFromUrl) return null;
      const res = await fetch(`/api/products/${productIdFromUrl}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!productIdFromUrl
  });

  useEffect(() => {
    if (directProduct) {
      setSelectedProduct(directProduct);
    }
  }, [directProduct]);

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
    },
    onError: (error: Error, variables, context: any) => {
      if (context?.previousCart) {
        queryClient.setQueryData(["/api/cart"], context.previousCart);
      }
      if (isUnauthorizedError(error)) {
        toast({
          title: t('login_required'),
          description: t('login_to_add_cart'),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t('error'),
        description: t('error_add_cart'),
        variant: "destructive",
      });
    },
  });

  const notifyMeMutation = useMutation({
    mutationFn: async (productId: number) => {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error("Failed to subscribe");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.message === "Already subscribed") {
        toast({
          title: t('already_subscribed'),
          description: t('already_subscribed_desc'),
        });
      } else {
        toast({
          title: t('subscribed'),
          description: t('subscribed_desc'),
        });
      }
    },
    onError: () => {
      toast({
        title: t('error'),
        description: t('error_subscribe_notifications'),
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
    onMutate: async ({ cartItemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/cart"] });
      const previousCart = queryClient.getQueryData(["/api/cart"]);

      queryClient.setQueryData(["/api/cart"], (old: any[] = []) => {
        return old.map((item) =>
          item.id === cartItemId ? { ...item, quantity } : item
        );
      });

      return { previousCart };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (error: Error, variables, context: any) => {
      if (context?.previousCart) {
        queryClient.setQueryData(["/api/cart"], context.previousCart);
      }
      toast({
        title: t('error'),
        description: t('error_update_quantity'),
        variant: "destructive",
      });
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async (cartItemId: number) => {
      const res = await fetch(`/api/cart/${cartItemId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove item");
      return cartItemId;
    },
    onMutate: async (cartItemId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/cart"] });
      const previousCart = queryClient.getQueryData(["/api/cart"]);

      queryClient.setQueryData(["/api/cart"], (old: any[] = []) => {
        return old.filter((item) => item.id !== cartItemId);
      });

      return { previousCart };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (error: Error, variables, context: any) => {
      if (context?.previousCart) {
        queryClient.setQueryData(["/api/cart"], context.previousCart);
      }
      toast({
        title: t('error'),
        description: t('error_remove_item'),
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
    <div className="space-y-6">
      <div className="w-full h-64 sm:h-80 relative rounded-2xl overflow-hidden shadow-lg">
        {(product.imageUrl?.startsWith('http') || product.imageUrl?.startsWith('/')) ? (
          <img
            src={product.imageUrl}
            alt={getProductName(product)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 text-[4rem]">
            {product.imageUrl}
          </div>
        )}
        {!product.isAvailable || product.stock === 0 ? (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <span className="text-white font-bold text-xl border-2 border-white px-6 py-2 rounded-full uppercase tracking-widest">
              {t('out_of_stock')}
            </span>
          </div>
        ) : null}
      </div>
      <div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium text-muted-foreground">{t('price')}</span>
            <span className="text-3xl font-bold text-primary flex items-start" data-testid="text-modal-price">
              {product.price}<span className="text-sm font-normal mt-1 ml-1">{i18n.language === 'ar' ? 'جنيه' : 'EGP'}</span>
            </span>
          </div>
          <div className="flex items-center justify-between border-b pb-4">
            <span className="text-lg font-medium text-muted-foreground">{t('unit')}</span>
            <Badge variant="outline" className="text-base px-3 py-1">{t(product.unit as any)}</Badge>
          </div>

          <div className="pt-2">
            <h4 className="font-semibold mb-2">{t('description')}</h4>
            <p className="text-muted-foreground leading-relaxed">
              {getProductDescription(product)}
            </p>
          </div>
        </div>
      </div>

      <div className="pt-4">
        {!product.isAvailable || product.stock === 0 ? (
          <Button
            className="w-full h-12 text-lg rounded-xl"
            variant="secondary"
            onClick={async () => {
              if (!user) {
                toast({
                  title: t('login_required'),
                  description: t('login_to_notify'),
                  variant: "destructive",
                });
                setLocation("/auth");
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
              notifyMeMutation.mutate(product.id);
            }}
            disabled={notifyMeMutation.isPending}
          >
            <Bell className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
            {t('notify_me')}
          </Button>
        ) : getCartQuantity(product.id) === 0 ? (
          <Button
            className="w-full h-12 text-lg rounded-xl shadow-lg hover:shadow-primary/25 transition-all"
            onClick={() => {
              addToCartMutation.mutate(product.id);
              if (!isMobile) setSelectedProduct(null);
            }}
            disabled={addToCartMutation.isPending}
            data-testid="button-modal-add-to-cart"
          >
            <ShoppingCart className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
            {t('add_to_cart')}
          </Button>
        ) : (
          <div className="flex items-center gap-3 bg-muted/50 p-2 rounded-xl">
            <Button
              variant="outline"
              className="h-12 w-12 rounded-lg border-2"
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
              <Minus className="w-5 h-5" />
            </Button>
            <span className="flex-1 text-center font-bold text-xl" data-testid="text-modal-quantity">
              {getCartQuantity(product.id)}
            </span>
            <Button
              variant="outline"
              className="h-12 w-12 rounded-lg border-2"
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
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const filteredProducts = products.filter((product) => {
    const matchesSearch = getProductName(product).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === null || product.categoryId === selectedCategory;

    // If searching, ignore category filter
    if (searchQuery) {
      return matchesSearch;
    }

    return matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background page-transition">
      {/* Desktop Layout with Sidebar */}
      <div className="hidden lg:flex">
        {/* Desktop Sidebar - Categories */}
        <aside className="w-64 xl:w-72 shrink-0 border-r bg-muted/20 min-h-[calc(100vh-4rem)] sticky top-16 self-start">
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4 text-primary">{t('categories')}</h2>
            <nav className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedCategory === null
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
              >
                <Sparkles className="w-5 h-5" />
                {t('all_categories')}
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedCategory === category.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                >
                  {translateContent(category.name, i18n.language)}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Desktop Main Content */}
        <main className="flex-1 min-w-0">
          {/* Desktop Search Header */}
          <div className="sticky top-16 z-20 bg-background/95 backdrop-blur-xl border-b p-6">
            <div className="max-w-2xl">
              <div className="relative">
                <Search className={`absolute ${i18n.language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground`} />
                <Input
                  className={`w-full ${i18n.language === 'ar' ? 'pr-12' : 'pl-12'} h-12 bg-muted/50 border rounded-xl text-base`}
                  placeholder={t('search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className={`absolute ${i18n.language === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full`}
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-muted-foreground">
                {searchQuery
                  ? `${products.length} ${isRTL ? 'نتيجة للبحث' : 'results found'}`
                  : `${products.length} ${isRTL ? 'منتج' : 'products'}`
                }
              </p>
            </div>
          </div>

          {/* Desktop Products Grid */}
          <div className="p-6">
            {isProductsLoading ? (
              <div className="flex flex-col justify-center items-center py-24 space-y-4">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
                <p className="text-muted-foreground">{t('loading_products')}</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-24">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('no_products')}</h3>
                <p className="text-muted-foreground">{isRTL ? 'جرب البحث بكلمات مختلفة' : 'Try different search terms'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {products.map((product, index) => {
                  const quantity = getCartQuantity(product.id);
                  const cartItem = getCartItem(product.id);
                  return (
                    <Card
                      key={product.id}
                      className="group relative border shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden bg-white dark:bg-slate-950 animate-fade-in"
                      style={{ animationDelay: `${index * 30}ms` }}
                      data-testid={`card-product-${product.id}`}
                    >
                      <div className="aspect-square relative overflow-hidden bg-muted/20">
                        {(product.imageUrl?.startsWith('http') || product.imageUrl?.startsWith('/')) ? (
                          <img
                            src={product.imageUrl}
                            alt={getProductName(product)}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer"
                            onClick={() => setSelectedProduct(product)}
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center bg-gray-50 text-[6rem] transition-transform duration-500 group-hover:scale-110 cursor-pointer"
                            onClick={() => setSelectedProduct(product)}
                          >
                            {product.imageUrl}
                          </div>
                        )}

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        {/* Stock Badge */}
                        {!product.isAvailable || product.stock === 0 ? (
                          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-10">
                            <Badge variant="destructive" className="text-sm font-bold px-4 py-2 shadow-lg">
                              {t('out_of_stock')}
                            </Badge>
                          </div>
                        ) : null}

                        {/* Quick Add Button */}
                        {product.isAvailable && product.stock > 0 && quantity === 0 && (
                          <button
                            className="absolute bottom-4 right-4 rtl:right-auto rtl:left-4 w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-lg flex items-center justify-center text-primary opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-primary hover:text-white z-20"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCartMutation.mutate(product.id);
                            }}
                          >
                            <Plus className="w-6 h-6" />
                          </button>
                        )}
                      </div>

                      <div className="p-5 space-y-3">
                        <div onClick={() => setSelectedProduct(product)} className="cursor-pointer">
                          <h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors text-left rtl:text-right min-h-[2.5rem]">
                            {getProductName(product)}
                          </h3>
                          <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-2xl font-bold text-primary">
                              {product.price}
                            </span>
                            <span className="text-sm text-muted-foreground">{i18n.language === 'ar' ? 'جنيه' : 'EGP'}</span>
                            <span className="text-sm text-muted-foreground ml-auto rtl:mr-auto rtl:ml-0">/ {t(product.unit as any)}</span>
                          </div>
                        </div>

                        {/* Desktop Actions */}
                        <div className="pt-2">
                          {quantity === 0 ? (
                            !product.isAvailable || product.stock === 0 ? (
                              <Button
                                className="w-full h-11 rounded-xl"
                                variant="secondary"
                                onClick={async () => {
                                  if (!user) {
                                    toast({
                                      title: t('login_required'),
                                      description: t('login_to_notify'),
                                      variant: "destructive",
                                    });
                                    setLocation("/auth");
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
                                  notifyMeMutation.mutate(product.id);
                                }}
                                disabled={notifyMeMutation.isPending}
                              >
                                <Bell className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                {t('notify_me')}
                              </Button>
                            ) : (
                              <Button
                                className="w-full h-11 rounded-xl shadow-sm hover:shadow-lg transition-all"
                                onClick={() => addToCartMutation.mutate(product.id)}
                                disabled={addToCartMutation.isPending}
                              >
                                <ShoppingCart className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                {t('add_to_cart')}
                              </Button>
                            )
                          ) : (
                            <div className="flex items-center justify-between bg-muted/50 rounded-xl p-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800 shadow-sm"
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
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="font-bold text-lg w-10 text-center">
                                {quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800 shadow-sm"
                                onClick={() => {
                                  if (cartItem) {
                                    updateQuantityMutation.mutate({
                                      cartItemId: cartItem.id,
                                      quantity: quantity + 1,
                                    });
                                  }
                                }}
                                disabled={updateQuantityMutation.isPending}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden pb-4">
        {/* Mobile Sticky Search Header - Below main navbar */}
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-xl border-b shadow-sm">
          <div className="container px-4 py-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className={`absolute ${i18n.language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground`} />
              <Input
                className={`w-full ${i18n.language === 'ar' ? 'pr-12' : 'pl-12'} h-12 bg-muted/50 border-none rounded-xl text-base`}
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute ${i18n.language === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full`}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Categories Pills - Mobile */}
          {!searchQuery && (
            <div className="overflow-x-auto hide-scrollbar">
              <div className="flex gap-2 px-4 pb-3">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${selectedCategory === null
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                >
                  {t('all_categories')}
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${selectedCategory === category.id
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                  >
                    {translateContent(category.name, i18n.language)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Products Grid */}
        <div className="container px-4 py-4">
          {isProductsLoading ? (
            <div className="flex flex-col justify-center items-center py-16 space-y-3">
              <div className="animate-spin w-10 h-10 border-3 border-primary border-t-transparent rounded-full"></div>
              <p className="text-muted-foreground text-sm">{t('loading_products')}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">{t('no_products')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {products.map((product, index) => {
                const quantity = getCartQuantity(product.id);
                const cartItem = getCartItem(product.id);
                return (
                  <Card
                    key={product.id}
                    className="group relative border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                    data-testid={`card-product-${product.id}`}
                  >
                    <div className="aspect-[4/5] relative overflow-hidden bg-muted/20">
                      {(product.imageUrl?.startsWith('http') || product.imageUrl?.startsWith('/')) ? (
                        <img
                          src={product.imageUrl}
                          alt={getProductName(product)}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer"
                          onClick={() => setSelectedProduct(product)}
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center bg-gray-50 text-[5rem] transition-transform duration-500 group-hover:scale-110 cursor-pointer"
                          onClick={() => setSelectedProduct(product)}
                        >
                          {product.imageUrl}
                        </div>
                      )}

                      {/* Stock Badge */}
                      {!product.isAvailable || product.stock === 0 ? (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-10">
                          <Badge variant="destructive" className="text-sm font-bold px-3 py-1 shadow-lg">
                            {t('out_of_stock')}
                          </Badge>
                        </div>
                      ) : null}
                    </div>

                    <div className="p-3 space-y-2">
                      <div onClick={() => setSelectedProduct(product)} className="cursor-pointer">
                        <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors text-left rtl:text-right">
                          {getProductName(product)}
                        </h3>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-lg font-bold text-primary">
                            {product.price}
                          </span>
                          <span className="text-xs text-muted-foreground">{i18n.language === 'ar' ? 'جنيه' : 'EGP'}</span>
                          <span className="text-xs text-muted-foreground ml-auto rtl:mr-auto rtl:ml-0">{t(product.unit as any)}</span>
                        </div>
                      </div>

                      {/* Mobile Actions */}
                      <div className="pt-2">
                        {quantity === 0 ? (
                          !product.isAvailable || product.stock === 0 ? (
                            <Button
                              className="w-full h-9 text-xs rounded-lg"
                              variant="secondary"
                              onClick={async () => {
                                if (!user) {
                                  toast({
                                    title: t('login_required'),
                                    description: t('login_to_notify'),
                                    variant: "destructive",
                                  });
                                  setLocation("/auth");
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
                                notifyMeMutation.mutate(product.id);
                              }}
                              disabled={notifyMeMutation.isPending}
                            >
                              <Bell className="w-3 h-3 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
                              {t('notify_me')}
                            </Button>
                          ) : (
                            <Button
                              className="w-full h-9 rounded-lg shadow-sm hover:shadow-md transition-all bg-primary/90 hover:bg-primary"
                              onClick={() => addToCartMutation.mutate(product.id)}
                              disabled={addToCartMutation.isPending}
                            >
                              <ShoppingCart className="w-4 h-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
                              {t('add')}
                            </Button>
                          )
                        ) : (
                          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 rounded-md hover:bg-white dark:hover:bg-slate-800 shadow-sm"
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
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="font-semibold text-sm w-6 text-center">
                              {quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 rounded-md hover:bg-white dark:hover:bg-slate-800 shadow-sm"
                              onClick={() => {
                                if (cartItem) {
                                  updateQuantityMutation.mutate({
                                    cartItemId: cartItem.id,
                                    quantity: quantity + 1,
                                  });
                                }
                              }}
                              disabled={updateQuantityMutation.isPending}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Product Details Modal/Drawer */}
      {isMobile ? (
        <Drawer open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
          <DrawerContent className="bg-background/95 backdrop-blur-xl border-t-0 rounded-t-[2rem]">
            <DrawerHeader className="text-left rtl:text-right pb-0">
              <DrawerTitle className="text-2xl font-bold text-primary">{selectedProduct && getProductName(selectedProduct)}</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 pb-8">
              {selectedProduct && <ProductDetailsContent product={selectedProduct} />}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
          <DialogContent className="overflow-hidden max-w-4xl p-0 gap-0 rounded-3xl border-none shadow-2xl bg-white dark:bg-slate-950">
            <div className="grid grid-cols-2 h-[500px]">
              <div className="relative h-full bg-muted overflow-hidden">
                {(selectedProduct?.imageUrl?.startsWith('http') || selectedProduct?.imageUrl?.startsWith('/')) ? (
                  <img
                    src={selectedProduct?.imageUrl}
                    alt={selectedProduct ? getProductName(selectedProduct) : ""}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-[8rem]">
                    {selectedProduct?.imageUrl}
                  </div>
                )}
                {!selectedProduct?.isAvailable || selectedProduct?.stock === 0 ? (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-white font-bold text-2xl border-4 border-white px-8 py-3 rounded-full uppercase tracking-widest transform -rotate-12">
                      {t('out_of_stock')}
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="p-8 flex flex-col h-full overflow-y-auto">
                <DialogHeader className="mb-6 text-left rtl:text-right">
                  <DialogTitle className="text-3xl font-bold text-primary mb-2">
                    {selectedProduct && getProductName(selectedProduct)}
                  </DialogTitle>
                  <DialogDescription className="text-lg">
                    {selectedProduct && getProductDescription(selectedProduct)}
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-auto space-y-6">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{t('price')}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-primary">{selectedProduct?.price}</span>
                        <span className="text-muted-foreground">{i18n.language === 'ar' ? 'جنيه' : 'EGP'}</span>
                      </div>
                    </div>
                    <div className="text-right rtl:text-left">
                      <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{t('unit')}</p>
                      <Badge variant="secondary" className="text-base px-3">{selectedProduct && t(selectedProduct.unit as any)}</Badge>
                    </div>
                  </div>

                  {selectedProduct && (
                    <div className="pt-2">
                      {!selectedProduct.isAvailable || selectedProduct.stock === 0 ? (
                        <Button
                          className="w-full h-14 text-lg rounded-xl"
                          variant="secondary"
                          onClick={async () => {
                            if (!user) {
                              toast({
                                title: t('login_required'),
                                description: t('login_to_notify'),
                                variant: "destructive",
                              });
                              setLocation("/auth");
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
                            notifyMeMutation.mutate(selectedProduct.id);
                          }}
                          disabled={notifyMeMutation.isPending}
                        >
                          <Bell className="w-6 h-6 mr-2 rtl:ml-2 rtl:mr-0" />
                          {t('notify_me')}
                        </Button>
                      ) : getCartQuantity(selectedProduct.id) === 0 ? (
                        <Button
                          className="w-full h-14 text-lg rounded-xl shadow-lg hover:shadow-primary/25 transition-all"
                          onClick={() => addToCartMutation.mutate(selectedProduct.id)}
                          disabled={addToCartMutation.isPending}
                        >
                          <ShoppingCart className="w-6 h-6 mr-2 rtl:ml-2 rtl:mr-0" />
                          {t('add_to_cart')}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-4 bg-muted/50 p-2 rounded-2xl">
                          <Button
                            variant="outline"
                            className="h-14 w-14 rounded-xl border-2"
                            onClick={() => {
                              const cartItem = getCartItem(selectedProduct.id);
                              if (cartItem) {
                                if (cartItem.quantity > 1) {
                                  updateQuantityMutation.mutate({
                                    cartItemId: cartItem.id,
                                    quantity: cartItem.quantity - 1,
                                  });
                                } else {
                                  removeFromCartMutation.mutate(cartItem.id);
                                }
                              }
                            }}
                            disabled={updateQuantityMutation.isPending || removeFromCartMutation.isPending}
                          >
                            <Minus className="w-6 h-6" />
                          </Button>
                          <span className="flex-1 text-center font-bold text-2xl">
                            {getCartQuantity(selectedProduct.id)}
                          </span>
                          <Button
                            variant="outline"
                            className="h-14 w-14 rounded-xl border-2"
                            onClick={() => {
                              const cartItem = getCartItem(selectedProduct.id);
                              if (cartItem) {
                                updateQuantityMutation.mutate({
                                  cartItemId: cartItem.id,
                                  quantity: getCartQuantity(selectedProduct.id) + 1,
                                });
                              }
                            }}
                            disabled={updateQuantityMutation.isPending}
                          >
                            <Plus className="w-6 h-6" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
