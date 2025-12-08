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
import { QuantitySelector } from "@/components/shop/quantity-selector";
import { cn } from "@/lib/utils";

export default function Shop() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';

  // Sync search query with URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSearch = urlParams.get('search');
    if (urlSearch && urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [location]);

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
      return res.json();
    },
    onSuccess: (data) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
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

  // Product Details Modal Content
  const ProductDetailsContent = ({ product }: { product: Product }) => {
    const quantity = getCartQuantity(product.id);
    const cartItem = getCartItem(product.id);
    const isOutOfStock = !product.isAvailable || product.stock === 0;

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
            {product.englishName && i18n.language === 'ar' && (
              <p className="text-muted-foreground text-sm mt-1">{product.englishName}</p>
            )}
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
              <Button
                className="w-full h-14 text-lg font-semibold rounded-2xl gap-2 bg-amber-500 hover:bg-amber-600"
                onClick={() => handleNotifyMe(product.id)}
                disabled={notifyMeMutation.isPending}
              >
                <Bell className="w-5 h-5" />
                {isRTL ? 'أعلمني عند التوفر' : 'Notify When Available'}
              </Button>
            ) : quantity === 0 ? (
              <Button
                className="w-full h-14 text-lg font-semibold rounded-2xl gap-2 shadow-lg hover:shadow-xl transition-all"
                onClick={() => handleAddToCart(product.id)}
                disabled={addToCartMutation.isPending}
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
        <div className="pb-24 pt-2">
          {searchQuery ? (
            // Search Results View
            <div className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
                {products.length} {isRTL ? 'نتيجة' : 'results'} "{searchQuery}"
              </p>
              <div className="grid grid-cols-2 gap-3">
                {products.map((product) => (
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
                  }))}
                  isRTL={isRTL}
                />
              </div>

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
                  <div className="overflow-x-auto scrollbar-none">
                    <div className="flex gap-3 px-4 pb-2">
                      {hotDeals.map((product) => (
                        <div key={product.id} className="w-[160px] flex-shrink-0">
                          <ProductCard
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
                    </div>
                  </div>
                </div>
              )}

              {/* All Products Grid */}
              <div className="px-4">
                <SectionHeader
                  icon={Package}
                  title={selectedCategory
                    ? categories.find(c => c.id === selectedCategory)?.name || (isRTL ? 'المنتجات' : 'Products')
                    : (isRTL ? 'جميع المنتجات' : 'All Products')
                  }
                  subtitle={`${products.length} ${isRTL ? 'منتج' : 'products'}`}
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
      <div className="hidden lg:flex">
        {/* Desktop Sidebar - Categories */}
        <aside className="w-64 xl:w-72 shrink-0 border-r bg-card min-h-[calc(100vh-4rem)] sticky top-16 self-start">
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4 text-primary">{t('categories')}</h2>
            <nav className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  selectedCategory === null
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Sparkles className="w-5 h-5" />
                {t('all_categories')}
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    selectedCategory === category.id
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <span className="text-lg">{category.imageUrl || '📦'}</span>
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
                <Search className={cn(
                  "absolute top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground",
                  isRTL ? "right-4" : "left-4"
                )} />
                <Input
                  className={cn(
                    "w-full h-12 bg-muted/50 border rounded-xl text-base",
                    isRTL ? "pr-12" : "pl-12"
                  )}
                  placeholder={t('search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full",
                      isRTL ? "left-3" : "right-3"
                    )}
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
          <div className="p-6 space-y-8">
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
                <div className="grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                  {hotDeals.map((product) => (
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
            )}

            {/* All Products Section */}
            <div>
              <SectionHeader
                icon={Package}
                title={selectedCategory
                  ? categories.find(c => c.id === selectedCategory)?.name || (isRTL ? 'المنتجات' : 'Products')
                  : (isRTL ? 'جميع المنتجات' : 'All Products')
                }
                subtitle={`${products.length} ${isRTL ? 'منتج' : 'products'}`}
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
              ) : (
                <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                  {products.map((product, index) => (
                    <div
                      key={product.id}
                      className="animate-in fade-in slide-in-from-bottom-2"
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
                        t={t}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ======================================== */}
      {/* PRODUCT DETAILS MODAL/DRAWER */}
      {/* ======================================== */}
      {isMobile ? (
        <Drawer open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
          <DrawerContent className="max-h-[90vh]">
            <div className="overflow-y-auto p-6">
              {selectedProduct && <ProductDetailsContent product={selectedProduct} />}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
          <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden">
            {selectedProduct && <ProductDetailsContent product={selectedProduct} />}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
