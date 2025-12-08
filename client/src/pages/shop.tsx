import { useState, useEffect } from "react";
import { subscribeToPushNotifications } from "@/lib/push-notifications";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Search, ShoppingCart, Plus, Minus, X, Bell, Sparkles, Package, Flame, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import i18n from "@/lib/i18n";
import type { Product, Category } from "@shared/schema";
import { translateContent } from "@/lib/translator";
import { useAuth } from "@/hooks/useAuth";

// New shop components
import { ProductCard } from "@/components/shop/product-card";
import { CategoryRow } from "@/components/shop/category-tile";
import { HeroBanner, defaultBanners } from "@/components/shop/hero-banner";
import { AutoScrollArea } from "@/components/ui/auto-scroll-area";
import { QuantitySelector } from "@/components/shop/quantity-selector";
import { ProductDetailsContent } from "@/components/shop/product-details-content";
import { cn } from "@/lib/utils";

export default function Shop() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [notifiedProducts, setNotifiedProducts] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';



  // Listen for instant search from header
  useEffect(() => {
    const handleHeaderSearch = (e: CustomEvent) => {
      const value = e.detail as string;
      setSearchQuery(value);
      if (value) {
        setSelectedCategory(null); // Clear category when searching
      }
    };

    window.addEventListener('header-search', handleHeaderSearch as EventListener);
    return () => {
      window.removeEventListener('header-search', handleHeaderSearch as EventListener);
    };
  }, []);

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

  // Sync search query and category with URL params on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSearch = urlParams.get('search');
    const urlCategory = urlParams.get('category');

    if (urlSearch) {
      setSearchQuery(urlSearch);
      setSelectedCategory(null);
    } else if (urlCategory && categories.length > 0) {
      // Find category by slug
      const category = categories.find(c => c.slug === urlCategory || c.slug === `/${urlCategory}`);
      if (category) {
        setSelectedCategory(category.id);
      }
    }
  }, [categories]);

  const { data: products = [], isLoading: isProductsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", selectedCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory && !searchQuery) params.append("categoryId", selectedCategory.toString());
      if (searchQuery) params.append("search", searchQuery);
      const res = await fetch(`/api/products${params.toString() ? "?" + params.toString() : ""}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

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

  // Mutations
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
            item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
          );
        }
        const product = products.find(p => p.id === productId);
        return [...old, { id: Math.random(), productId, quantity: 1, product }];
      });
      return { previousCart };
    },
    onSuccess: (data) => {
      // Update cache with server response without refetching
      queryClient.setQueryData(["/api/cart"], (old: any[] = []) => {
        const existingItem = old.find((item) => item.productId === data.productId);
        if (existingItem) {
          return old.map((item) =>
            item.productId === data.productId ? { ...item, ...data } : item
          );
        }
        return [...old, data];
      });
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
        setTimeout(() => { setLocation("/auth"); }, 500);
        return;
      }
      toast({ title: t('error'), description: t('error_add_cart'), variant: "destructive" });
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
      return { ...await res.json(), productId };
    },
    onSuccess: (data) => {
      // Add to notified products set
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
        return old.map((item) => item.id === cartItemId ? { ...item, quantity } : item);
      });
      return { previousCart };
    },
    onSuccess: (data) => {
      // Update cache with server response without refetching
      queryClient.setQueryData(["/api/cart"], (old: any[] = []) => {
        return old.map((item) => item.id === data.id ? { ...item, ...data } : item);
      });
    },

    onError: (error: Error, variables, context: any) => {
      if (context?.previousCart) {
        queryClient.setQueryData(["/api/cart"], context.previousCart);
      }
      toast({ title: t('error'), description: t('error_update_quantity'), variant: "destructive" });
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
      toast({ title: t('error'), description: t('error_remove_item'), variant: "destructive" });
    },
  });

  const getCartItem = (productId: number) => {
    return cartItems.find((item: any) => item.productId === productId);
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
      updateQuantityMutation.mutate({ cartItemId: cartItem.id, quantity: cartItem.quantity + 1 });
    }
  };

  const handleDecrement = (productId: number) => {
    const cartItem = getCartItem(productId);
    if (cartItem) {
      if (cartItem.quantity === 1) {
        removeFromCartMutation.mutate(cartItem.id);
      } else {
        updateQuantityMutation.mutate({ cartItemId: cartItem.id, quantity: cartItem.quantity - 1 });
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
    notifyMeMutation.mutate(productId);
  };

  // Product Details Modal Content moved to separate component
  // kept comment for diff clarity


  // Section Header Component
  const SectionHeader = ({
    icon: Icon,
    title,
    subtitle,
    action,
  }: {
    icon?: any;
    title: string;
    subtitle?: string;
    action?: { label: string; onClick: () => void };
  }) => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action && (
        <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={action.onClick}>
          {action.label}
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </Button>
      )}
    </div>
  );

  // Hot Deals / Featured Products Section (horizontal scroll)
  const hotDeals = products.filter(p => p.isAvailable && p.stock && p.stock > 0).slice(0, 8);

  return (
    <div className="min-h-screen bg-background">
      {/* ======================================== */}
      {/* MOBILE LAYOUT */}
      {/* ======================================== */}
      <div className="lg:hidden">
        {/* Main Content */}
        <div className="pb-24 pt-4">
          {searchQuery ? (
            // Search Results View - Grouped by Category
            <div className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
                {products.length} {isRTL ? 'نتيجة' : 'results'} "{searchQuery}"
              </p>
              {/* Group products by category */}
              {(() => {
                const grouped = products.reduce((acc, product) => {
                  const catId = product.categoryId;
                  if (!acc[catId]) acc[catId] = [];
                  acc[catId].push(product);
                  return acc;
                }, {} as Record<number, typeof products>);

                return Object.entries(grouped).map(([catId, categoryProducts]) => {
                  const category = categories.find(c => c.id === Number(catId));
                  const categoryName = i18n.language === 'en' && category?.englishName
                    ? category.englishName
                    : category?.name || (isRTL ? 'أخرى' : 'Other');

                  return (
                    <div key={catId} className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{category?.imageUrl || '📦'}</span>
                        <h3 className="font-bold text-sm text-muted-foreground">{categoryName}</h3>
                        <span className="text-xs text-muted-foreground">({categoryProducts.length})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {categoryProducts.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            quantity={getCartQuantity(product.id)}
                            onAddToCart={() => handleAddToCart(product.id)}
                            onIncrement={() => handleIncrement(product.id)}
                            onDecrement={() => handleDecrement(product.id)}
                            onNotifyMe={() => handleNotifyMe(product.id)}
                            onClick={() => setSelectedProduct(product)}
                            isRTL={isRTL}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
              {products.length === 0 && !isProductsLoading && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-10 h-10 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{t('no_products')}</h3>
                  <p className="text-muted-foreground">{isRTL ? 'جرب كلمات بحث مختلفة' : 'Try different search terms'}</p>
                </div>
              )}
            </div>
          ) : (
            // Home View with Sections
            <div className="space-y-6">
              {/* Hero Banner */}
              <div className="px-4 pt-4">
                <HeroBanner
                  banners={defaultBanners.map(b => ({
                    ...b,
                    title: isRTL ? (b.id === 1 ? '🥬 عروض الخضروات الطازجة!' : b.id === 2 ? '🎉 عرض نهاية الأسبوع' : '📦 منتجات جديدة') : b.title,
                    subtitle: isRTL ? (b.id === 1 ? 'خصم حتى 30% على الفواكه والخضروات' : b.id === 2 ? 'توصيل مجاني للطلبات أكثر من 200 جنيه' : 'اكتشف أحدث المنتجات') : b.subtitle,
                    ctaText: isRTL ? 'تسوق الآن' : b.ctaText,
                    // Map banner IDs to category slugs or IDs
                    ctaLink: b.id === 1 ? 'fresh-produce' : b.id === 3 ? 'new-arrivals' : undefined
                  }))}
                  isRTL={isRTL}
                  onBannerClick={(banner) => {
                    // Find category by slug (ctaLink)
                    if (banner.ctaLink) {
                      const category = categories?.find(c => c.slug === banner.ctaLink);
                      if (category) {
                        setSelectedCategory(category.id);
                        // Wait for render then scroll to products grid
                        setTimeout(() => {
                          document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                        return;
                      }
                    }
                    // Fallback: just scroll to products grid
                    document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                />
              </div>

              {/* Hot Deals Section */}
              {hotDeals.length > 0 && (
                <div>
                  <div className="px-4">
                    <SectionHeader
                      icon={Flame}
                      title={isRTL ? '🔥 عروض مميزة' : '🔥 Hot Deals'}
                      subtitle={isRTL ? 'لا تفوت هذه العروض' : "Don't miss these offers"}
                    />
                  </div>
                  <AutoScrollArea className="px-4 pb-2" speed={0.5} intervalMs={20}>
                    {hotDeals.map((product) => (
                      <div key={product.id} className="w-[160px] flex-shrink-0">
                        <ProductCard
                          key={product.id}
                          product={product}
                          quantity={getCartQuantity(product.id)}
                          onAddToCart={() => handleAddToCart(product.id)}
                          onIncrement={() => handleIncrement(product.id)}
                          onDecrement={() => handleDecrement(product.id)}
                          onNotifyMe={() => handleNotifyMe(product.id)}
                          onClick={() => setSelectedProduct(product)}
                          isRTL={isRTL}
                          isNotifySubscribed={notifiedProducts.has(product.id)}
                          t={t}
                        />
                      </div>
                    ))}
                  </AutoScrollArea>
                </div>
              )}

              {/* Categories Row */}
              <div className="px-4">
                <SectionHeader
                  icon={Sparkles}
                  title={isRTL ? 'الأقسام' : 'Categories'}
                />
                <CategoryRow
                  categories={categories}
                  activeId={selectedCategory}
                  onSelect={setSelectedCategory}
                  isRTL={isRTL}
                />
              </div>

              {/* All Products Grid */}
              <div className="px-4" id="products-grid">
                <SectionHeader
                  icon={Package}
                  title={selectedCategory
                    ? categories.find(c => c.id === selectedCategory)?.name || (isRTL ? 'المنتجات' : 'Products')
                    : (isRTL ? 'جميع المنتجات' : 'All Products')
                  }
                  subtitle={selectedCategory ? `${products.length} ${isRTL ? 'منتج' : 'products'}` : undefined}
                />

                {isProductsLoading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-muted-foreground">{t('loading_products')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {products.map((product, index) => (
                      <div
                        key={product.id}
                        className="animate-in fade-in slide-in-from-bottom-2"
                        style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                      >
                        <ProductCard
                          product={product}
                          quantity={getCartQuantity(product.id)}
                          onAddToCart={() => handleAddToCart(product.id)}
                          onIncrement={() => handleIncrement(product.id)}
                          onDecrement={() => handleDecrement(product.id)}
                          onNotifyMe={() => handleNotifyMe(product.id)}
                          onClick={() => setSelectedProduct(product)}
                          isRTL={isRTL}
                          isNotifySubscribed={notifiedProducts.has(product.id)}
                          t={t}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================== */}
      {/* DESKTOP LAYOUT */}
      {/* ======================================== */}
      <div className="hidden lg:block min-h-screen bg-background pb-12">
        <div className="w-full px-4 lg:px-8 py-8 space-y-12">
          {/* Desktop Info Header - Only show when searching */}
          {
            searchQuery && (
              <div className="sticky top-16 z-20 bg-background/95 backdrop-blur-xl border-b px-6 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {products.length} {isRTL ? 'نتيجة للبحث عن' : 'results for'} "{searchQuery}"
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      window.dispatchEvent(new CustomEvent('clear-search'));
                    }}
                  >
                    <X className="w-4 h-4 me-1" />
                    {isRTL ? 'مسح البحث' : 'Clear search'}
                  </Button>
                </div>
              </div>
            )
          }

          {/* Desktop Products Grid */}

          {/* Desktop Hero Banner */}
          {!searchQuery && (
            <HeroBanner
              banners={defaultBanners.map(b => ({
                ...b,
                title: isRTL ? (b.id === 1 ? '🥬 عروض الخضروات الطازجة!' : b.id === 2 ? '🎉 عرض نهاية الأسبوع' : '📦 منتجات جديدة') : b.title,
                subtitle: isRTL ? (b.id === 1 ? 'خصم حتى 30% على الفواكه والخضروات' : b.id === 2 ? 'توصيل مجاني للطلبات أكثر من 200 جنيه' : 'اكتشف أحدث المنتجات') : b.subtitle,
                ctaText: isRTL ? 'تسوق الآن' : b.ctaText,
              }))}
              isRTL={isRTL}
            />
          )}

          {/* Desktop Hot Deals Section */}
          {!searchQuery && hotDeals.length > 0 && (
            <div>
              <SectionHeader
                icon={Flame}
                title={isRTL ? '🔥 عروض مميزة' : '🔥 Hot Deals'}
                subtitle={isRTL ? 'لا تفوت هذه العروض' : "Don't miss these offers"}
              />
              <AutoScrollArea className="py-2" speed={0.5} intervalMs={20} paused={!!selectedProduct}>
                {hotDeals.map((product) => (
                  <div key={product.id} className="w-[220px] flex-shrink-0">
                    <ProductCard
                      key={product.id}
                      product={product}
                      quantity={getCartQuantity(product.id)}
                      onAddToCart={() => handleAddToCart(product.id)}
                      onIncrement={() => handleIncrement(product.id)}
                      onDecrement={() => handleDecrement(product.id)}
                      onNotifyMe={() => handleNotifyMe(product.id)}
                      onClick={() => setSelectedProduct(product)}
                      isRTL={isRTL}
                      t={t}
                    />
                  </div>
                ))}
              </AutoScrollArea>
            </div>
          )}
          {/* Horizontal Categories Row */}
          {!searchQuery && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="text-2xl">⚡</span> {t('categories')}
                </h2>
              </div>
              <CategoryRow
                categories={categories}
                activeId={selectedCategory}
                onSelect={(id) => {
                  if (!searchQuery) setSelectedCategory(id);
                }}
                isRTL={isRTL}
                size="lg"
              />
            </div>
          )}

          {/* All Products Section */}
          <div id="desktop-products-grid">
            <SectionHeader
              icon={Package}
              title={selectedCategory
                ? categories.find(c => c.id === selectedCategory)?.name || (isRTL ? 'المنتجات' : 'Products')
                : (isRTL ? 'جميع المنتجات' : 'All Products')
              }
              subtitle={selectedCategory ? `${products.length} ${isRTL ? 'منتج' : 'products'}` : undefined}
            />

            {isProductsLoading ? (
              <div className="flex flex-col justify-center items-center py-24 space-y-4">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
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
            ) : searchQuery ? (
              // Desktop grouped search results
              <div className="space-y-8">
                {(() => {
                  const grouped = products.reduce((acc, product) => {
                    const catId = product.categoryId;
                    if (!acc[catId]) acc[catId] = [];
                    acc[catId].push(product);
                    return acc;
                  }, {} as Record<number, typeof products>);

                  return Object.entries(grouped).map(([catId, categoryProducts]) => {
                    const category = categories.find(c => c.id === Number(catId));
                    const categoryName = i18n.language === 'en' && category?.englishName
                      ? category.englishName
                      : category?.name || (isRTL ? 'أخرى' : 'Other');

                    return (
                      <div key={catId}>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-2xl">{category?.imageUrl || '📦'}</span>
                          <h3 className="font-bold text-lg">{categoryName}</h3>
                          <span className="text-sm text-muted-foreground">({categoryProducts.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-6">
                          {categoryProducts.map((product, index) => (
                            <div
                              key={product.id}
                              className="w-[220px] animate-in fade-in slide-in-from-bottom-2"
                              style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
                            >
                              <ProductCard
                                product={product}
                                quantity={getCartQuantity(product.id)}
                                onAddToCart={() => handleAddToCart(product.id)}
                                onIncrement={() => handleIncrement(product.id)}
                                onDecrement={() => handleDecrement(product.id)}
                                onNotifyMe={() => handleNotifyMe(product.id)}
                                onClick={() => setSelectedProduct(product)}
                                isRTL={isRTL}
                                isNotifySubscribed={notifiedProducts.has(product.id)}
                                t={t}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div className="flex flex-wrap gap-6">
                {products.map((product, index) => (
                  <div
                    key={product.id}
                    className="w-[220px] animate-in fade-in slide-in-from-bottom-2"
                    style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
                  >
                    <ProductCard
                      product={product}
                      quantity={getCartQuantity(product.id)}
                      onAddToCart={() => handleAddToCart(product.id)}
                      onIncrement={() => handleIncrement(product.id)}
                      onDecrement={() => handleDecrement(product.id)}
                      onNotifyMe={() => handleNotifyMe(product.id)}
                      onClick={() => setSelectedProduct(product)}
                      isRTL={isRTL}
                      isNotifySubscribed={notifiedProducts.has(product.id)}
                      t={t}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================== */}
      {/* PRODUCT DETAILS MODAL/DRAWER */}
      {/* ======================================== */}
      {
        isMobile ? (
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
        )
      }
    </div >
  );
}
