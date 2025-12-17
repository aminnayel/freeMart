import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { subscribeToPushNotifications } from "@/lib/push-notifications";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
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
import { useAuthModal } from "@/components/auth/auth-modal-context";

// New shop components
import { ProductCard } from "@/components/shop/product-card";
import { CategoryRow } from "@/components/shop/category-tile";
import { HeroBanner } from "@/components/shop/hero-banner";
import type { Offer } from "@shared/schema";
import { AutoScrollArea } from "@/components/ui/auto-scroll-area";
import { QuantitySelector } from "@/components/shop/quantity-selector";
import { ProductDetailsContent } from "@/components/shop/product-details-content";
import { cn } from "@/lib/utils";

// Section Header Component - defined outside to prevent recreation on each render
const SectionHeader = memo(function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon?: any;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
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
});

export default function Shop() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [categoriesStuck, setCategoriesStuck] = useState(false);
  const [notifiedProducts, setNotifiedProducts] = useState<Set<number>>(new Set());
  const [isMounted, setIsMounted] = useState(false);
  const initialUrlSyncDone = useRef(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { openLogin } = useAuthModal();
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
    let categoriesOffset = 0;

    // Calculate the initial offset of categories section
    const updateCategoriesOffset = () => {
      const categoriesElement = document.getElementById('categories-section') ||
        document.getElementById('desktop-categories-section');
      if (categoriesElement) {
        categoriesOffset = categoriesElement.offsetTop;
      }
    };

    // Update offset on mount and when content changes
    updateCategoriesOffset();

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Check if we've scrolled past the categories section's natural position
      // If yes, it's stuck and should have shadow
      // Add small buffer (50px) to avoid premature shadow
      setCategoriesStuck(window.scrollY > categoriesOffset + 50);
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", updateCategoriesOffset);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateCategoriesOffset);
    };
  }, []);

  // Mount immediately - shimmer only shows when data is actually loading
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Stable callback for category selection - prevents CategoryRow re-renders
  // Scrolls to show products after category bar is in sticky position
  const handleCategorySelect = useCallback((id: number | null) => {
    setSelectedCategory(id);

    // Scroll to show products with categories bar at top (sticky)
    setTimeout(() => {
      requestAnimationFrame(() => {
        // Find the products grid section
        const mobileProductsGrid = document.getElementById('products-grid');
        const desktopProductsGrid = document.getElementById('desktop-products-grid');

        // Use the one that's actually visible
        const productsGrid = (mobileProductsGrid && mobileProductsGrid.offsetHeight > 0)
          ? mobileProductsGrid
          : desktopProductsGrid;

        // Find the categories section for offset calculation
        const mobileCategories = document.getElementById('categories-section');
        const desktopCategories = document.getElementById('desktop-categories-section');
        const categoriesBar = (mobileCategories && mobileCategories.offsetHeight > 0)
          ? mobileCategories
          : desktopCategories;

        if (productsGrid && categoriesBar) {
          // Scroll so products grid starts right below the sticky categories bar
          const categoriesHeight = categoriesBar.offsetHeight;
          const productsRect = productsGrid.getBoundingClientRect();
          const scrollTarget = window.scrollY + productsRect.top - categoriesHeight - 8; // 8px gap

          window.scrollTo({
            top: Math.max(0, scrollTarget),
            behavior: 'smooth'
          });
        }
      });
    }, 100); // Slightly longer delay to ensure DOM updates
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

  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch dynamic offers from admin
  const { data: offers = [], isLoading: isOffersLoading } = useQuery<Offer[]>({
    queryKey: ["/api/offers"],
  });

  // Helper to convert offers to banner format (convert nulls to undefined for Banner type)
  const offerBanners = offers.map(offer => ({
    id: offer.id,
    title: isRTL ? offer.title : (offer.titleEn || offer.title),
    subtitle: (isRTL ? offer.subtitle : (offer.subtitleEn || offer.subtitle)) || undefined,
    imageUrl: offer.imageUrl || undefined,
    backgroundColor: offer.backgroundColor || undefined,
    ctaText: (isRTL ? offer.ctaText : (offer.ctaTextEn || offer.ctaText)) || undefined,
    ctaLink: offer.linkValue,
    linkType: offer.linkType,
  }));

  // Handle offer click navigation
  const handleOfferClick = (banner: any) => {
    const linkType = banner.linkType;
    const linkValue = banner.ctaLink;

    switch (linkType) {
      case 'category':
        const category = categories?.find(c => c.slug === linkValue);
        if (category) {
          setSelectedCategory(category.id);
          // Scroll handled by category onSelect handler
        }
        break;
      case 'product':
        const productId = parseInt(linkValue);
        if (productId) {
          const product = products?.find(p => p.id === productId);
          if (product) {
            setSelectedProduct(product);
          }
        }
        break;
      case 'search':
        setSearchQuery(linkValue);
        setSelectedCategory(null);
        break;
      case 'url':
        if (linkValue.startsWith('http')) {
          window.open(linkValue, '_blank');
        } else {
          setLocation(linkValue);
        }
        break;
      default:
        // No default scroll
        break;
    }
  };

  // Sync search query and category with URL params on initial load (run only once when categories load)
  useEffect(() => {
    // Prevent running multiple times
    if (initialUrlSyncDone.current) return;
    if (categories.length === 0) return; // Wait for categories to load

    const urlParams = new URLSearchParams(window.location.search);
    const urlSearch = urlParams.get('search');
    const urlCategory = urlParams.get('category');

    if (urlSearch) {
      setSearchQuery(urlSearch);
      setSelectedCategory(null);
    } else if (urlCategory) {
      // Find category by slug
      const category = categories.find(c => c.slug === urlCategory || c.slug === `/${urlCategory}`);
      if (category) {
        setSelectedCategory(category.id);
      }
    }

    initialUrlSyncDone.current = true;
  }, [categories]);

  // Fetch ALL products once - filtering happens client-side to avoid refetch on category change
  const { data: allProducts = [], isLoading: isProductsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    staleTime: 30000, // Cache for 30 seconds to avoid unnecessary refetches
  });

  // Client-side filtering - no API refetch, instant category switching
  const products = useMemo(() => {
    let filtered = allProducts;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.englishName && p.englishName.toLowerCase().includes(query)) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory && !searchQuery) {
      filtered = filtered.filter(p => p.categoryId === selectedCategory);
    }

    return filtered;
  }, [allProducts, selectedCategory, searchQuery]);

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

  // Batch fetch wishlist product IDs (replaces N individual checks with 1 call)
  const { data: wishlistData } = useQuery<{ productIds: number[] }>({
    queryKey: ["/api/wishlist/product-ids"],
    enabled: !!user,
  });
  const wishlistProductIds = new Set(wishlistData?.productIds || []);

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

  const getCartItem = useCallback((productId: number) => {
    return cartItems.find((item: any) => item.productId === productId);
  }, [cartItems]);

  const getCartQuantity = useCallback((productId: number) => {
    const item = cartItems.find((item: any) => item.productId === productId);
    return item?.quantity || 0;
  }, [cartItems]);

  const handleAddToCart = useCallback((productId: number) => {
    addToCartMutation.mutate(productId);
  }, [addToCartMutation]);

  const handleIncrement = useCallback((productId: number) => {
    const cartItem = cartItems.find((item: any) => item.productId === productId);
    if (cartItem) {
      updateQuantityMutation.mutate({ cartItemId: cartItem.id, quantity: cartItem.quantity + 1 });
    }
  }, [cartItems, updateQuantityMutation]);

  const handleDecrement = useCallback((productId: number) => {
    const cartItem = cartItems.find((item: any) => item.productId === productId);
    if (cartItem) {
      if (cartItem.quantity === 1) {
        removeFromCartMutation.mutate(cartItem.id);
      } else {
        updateQuantityMutation.mutate({ cartItemId: cartItem.id, quantity: cartItem.quantity - 1 });
      }
    }
  }, [cartItems, updateQuantityMutation, removeFromCartMutation]);

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

  // Product Details Modal Content moved to separate component
  // kept comment for diff clarity


  // Product Details Modal Content moved to separate component
  // kept comment for diff clarity

  // Hot Deals / Featured Products Section (horizontal scroll) - memoized for performance
  const hotDeals = useMemo(() =>
    products.filter(p => p.isAvailable && p.stock && p.stock > 0).slice(0, 8),
    [products]
  );

  // Shimmer skeleton for instant visual feedback
  const ShimmerSkeleton = () => (
    <div className="animate-pulse">
      {/* Banner Skeleton */}
      <div className="px-4 pt-4">
        <div className="h-36 bg-gradient-to-r from-muted via-muted/80 to-muted rounded-3xl" />
      </div>

      {/* Hot Deals Skeleton */}
      <div className="px-4 mt-6">
        <div className="h-5 w-32 bg-muted rounded mb-4" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-[160px] flex-shrink-0">
              <div className="h-32 bg-muted rounded-xl mb-2" />
              <div className="h-4 bg-muted rounded w-3/4 mb-1" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>

      {/* Categories Skeleton */}
      <div className="px-4 mt-6">
        <div className="h-5 w-24 bg-muted rounded mb-4" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="w-16 flex-shrink-0 flex flex-col items-center">
              <div className="w-14 h-14 bg-muted rounded-2xl mb-2" />
              <div className="h-3 bg-muted rounded w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Products Grid Skeleton */}
      <div className="px-4 mt-6">
        <div className="h-5 w-28 bg-muted rounded mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-card rounded-2xl overflow-hidden shadow-sm">
              <div className="h-28 bg-muted" />
              <div className="p-3">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                <div className="h-9 bg-muted rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Check if initial data is loading (also show shimmer briefly on mount for smooth page transitions)
  const isInitialLoading = !isMounted || isCategoriesLoading || isOffersLoading || (isProductsLoading && products.length === 0);

  return (
    <div className="min-h-screen bg-background">
      {/* ======================================== */}
      {/* MOBILE LAYOUT */}
      {/* ======================================== */}
      <div className="lg:hidden overflow-x-hidden">
        {/* Main Content */}
        <div className="pb-24 pt-4">
          {isInitialLoading ? (
            // Show shimmer skeleton while initial data loads (including during search)
            <ShimmerSkeleton />
          ) : searchQuery ? (
            // Search Results View - Grouped by Category
            isProductsLoading ? (
              // Show shimmer while searching
              <ShimmerSkeleton />
            ) : (
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
                              isInWishlist={wishlistProductIds.has(product.id)}
                              t={t}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
                {products.length === 0 && !isProductsLoading && (
                  <div className="flex flex-col items-center justify-center text-center py-16">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                      <Search className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{t('no_products')}</h3>
                    <p className="text-muted-foreground">{isRTL ? 'جرب كلمات بحث مختلفة' : 'Try different search terms'}</p>
                  </div>
                )}
              </div>
            )
          ) : (
            // Home View with Sections
            <div className="space-y-6">
              {/* Hero Banner */}
              <div className="px-4 pt-4">
                {offerBanners.length > 0 ? (
                  <HeroBanner
                    banners={offerBanners}
                    isRTL={isRTL}
                    onBannerClick={handleOfferClick}
                  />
                ) : (
                  <div className="rounded-3xl bg-gradient-hero p-6 text-white relative overflow-hidden shadow-lg">
                    {/* Animated gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50 animate-pulse" style={{ animationDuration: '6s' }} />
                    <div className="relative z-10">
                      <h3 className="text-xl font-bold mb-2 drop-shadow-md">{isRTL ? 'مرحباً بك!' : 'Welcome!'}</h3>
                      <p className="text-white/90 text-sm drop-shadow">{isRTL ? 'اكتشف أفضل المنتجات والعروض' : 'Discover the best products and offers'}</p>
                    </div>
                  </div>
                )}
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
                  <AutoScrollArea className="px-4 pb-2" speed={0.5} intervalMs={20} direction={isRTL ? 'rtl' : 'ltr'}>
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
                          isInWishlist={wishlistProductIds.has(product.id)}
                          t={t}
                        />
                      </div>
                    ))}
                  </AutoScrollArea>
                </div>
              )}

              {/* Categories Row - Sticky */}
              <div id="categories-section" className={`sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b border-border/50 px-4 py-4 -mx-4 mb-4 transition-shadow duration-300 ${categoriesStuck ? 'shadow-md' : ''}`}>
                <div className="px-4">
                  <SectionHeader
                    icon={Sparkles}
                    title={isRTL ? 'الأقسام' : 'Categories'}
                  />
                </div>
                <CategoryRow
                  categories={categories}
                  activeId={selectedCategory}
                  onSelect={handleCategorySelect}
                  isRTL={isRTL}
                />
              </div>

              {/* All Products Grid */}
              <div className="px-4" id="products-grid">
                <SectionHeader
                  icon={Package}
                  title={searchQuery
                    ? (isRTL ? `نتائج البحث: "${searchQuery}"` : `Search: "${searchQuery}"`)
                    : selectedCategory
                      ? categories.find(c => c.id === selectedCategory)?.name || (isRTL ? 'المنتجات' : 'Products')
                      : (isRTL ? 'جميع المنتجات' : 'All Products')
                  }
                  subtitle={(selectedCategory || searchQuery) ? `${products.length} ${isRTL ? 'منتج' : 'products'}` : undefined}
                  action={(selectedCategory || searchQuery) ? {
                    label: isRTL ? 'عرض الكل' : 'Show All',
                    onClick: () => {
                      setSelectedCategory(null);
                      setSearchQuery('');
                    }
                  } : undefined}
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
                          isInWishlist={wishlistProductIds.has(product.id)}
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

          {/* Desktop Shimmer Skeleton */}
          {isInitialLoading && !searchQuery && (
            <div className="animate-pulse space-y-10">
              {/* Banner Skeleton */}
              <div className="h-48 bg-gradient-to-r from-muted via-muted/80 to-muted rounded-3xl" />

              {/* Hot Deals Skeleton */}
              <div>
                <div className="h-6 w-40 bg-muted rounded mb-6" />
                <div className="flex gap-6 overflow-hidden">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="w-[220px] flex-shrink-0">
                      <div className="h-40 bg-muted rounded-xl mb-3" />
                      <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-5 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Categories Skeleton */}
              <div>
                <div className="h-6 w-32 bg-muted rounded mb-6" />
                <div className="flex gap-4 overflow-hidden">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-muted rounded-2xl mb-2" />
                      <div className="h-4 bg-muted rounded w-16" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Products Grid Skeleton */}
              <div>
                <div className="h-6 w-36 bg-muted rounded mb-6" />
                <div className="grid grid-cols-4 xl:grid-cols-5 gap-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                    <div key={i} className="bg-card rounded-2xl overflow-hidden shadow-sm">
                      <div className="h-36 bg-muted" />
                      <div className="p-4">
                        <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                        <div className="h-5 bg-muted rounded w-1/2 mb-4" />
                        <div className="h-10 bg-muted rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Desktop Hero Banner */}
          {!isInitialLoading && !searchQuery && offerBanners.length > 0 && (
            <HeroBanner
              banners={offerBanners}
              isRTL={isRTL}
              onBannerClick={handleOfferClick}
            />
          )}

          {/* Desktop Hot Deals Section */}
          {!isInitialLoading && !searchQuery && hotDeals.length > 0 && (
            <div>
              <SectionHeader
                icon={Flame}
                title={isRTL ? '🔥 عروض مميزة' : '🔥 Hot Deals'}
                subtitle={isRTL ? 'لا تفوت هذه العروض' : "Don't miss these offers"}
              />
              <AutoScrollArea className="py-2" speed={0.5} intervalMs={20} paused={!!selectedProduct} direction={isRTL ? 'rtl' : 'ltr'}>
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
          {/* Horizontal Categories Row - Sticky on Desktop */}
          {!isInitialLoading && !searchQuery && (
            <div id="desktop-categories-section" className={`sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b border-border/50 py-6 -mx-4 lg:-mx-8 px-4 lg:px-8 mb-4 transition-shadow duration-300 ${categoriesStuck ? 'shadow-md' : ''}`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <span className="text-2xl">⚡</span> {t('categories')}
                  </h2>
                </div>
                <CategoryRow
                  categories={categories}
                  activeId={selectedCategory}
                  onSelect={handleCategorySelect}
                  isRTL={isRTL}
                  size="lg"
                />
              </div>
            </div>
          )}

          {/* All Products Section */}
          {!isInitialLoading && (
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
                <div className="flex flex-col items-center justify-center text-center py-24">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
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
                          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                            {categoryProducts.map((product, index) => (
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
                                  isNotifySubscribed={notifiedProducts.has(product.id)}
                                  isInWishlist={wishlistProductIds.has(product.id)}
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
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
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
                        isNotifySubscribed={notifiedProducts.has(product.id)}
                        isInWishlist={wishlistProductIds.has(product.id)}
                        t={t}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ======================================== */}
      {/* PRODUCT DETAILS MODAL/DRAWER */}
      {/* ======================================== */}
      {
        isMobile ? (
          <Drawer open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
            <DrawerContent className="max-h-[90vh]">
              {/* Accessibility - visually hidden but available for screen readers */}
              <DrawerTitle className="sr-only">
                {selectedProduct?.name || 'Product Details'}
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                {selectedProduct?.name || 'View product details'}
              </DrawerDescription>
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
              {/* Accessibility - visually hidden but available for screen readers */}
              <DialogTitle className="sr-only">
                {selectedProduct?.name || 'Product Details'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {selectedProduct?.name || 'View product details'}
              </DialogDescription>
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
