import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, User, Home, Menu, X, LayoutDashboard, Search, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { openLogin } = useAuthModal();
  const isRTL = i18n.language === 'ar';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState("");
  const [desktopSearchQuery, setDesktopSearchQuery] = useState("");
  const [preSearchLocation, setPreSearchLocation] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for clear-search event from shop.tsx
  useEffect(() => {
    const handleClearSearch = () => {
      setMobileSearchQuery('');
      setDesktopSearchQuery('');
    };
    window.addEventListener('clear-search', handleClearSearch);
    return () => window.removeEventListener('clear-search', handleClearSearch);
  }, []);

  const { data: cartItems = [] } = useQuery<any[]>({
    queryKey: ["/api/cart"],
    retry: false,
  });

  // Fetch wishlist count (works for guests too)
  const { data: wishlistItems = [] } = useQuery<any[]>({
    queryKey: ["/api/wishlist"],
  });

  const cartCount = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const wishlistCount = wishlistItems.length;

  // Admin pages use their own content but still get the header
  const isAdminPage = location.startsWith('/admin');

  const navLinks = [
    { href: "/", label: isRTL ? 'المتجر' : 'Shop', icon: Home },
    { href: "/wishlist", label: isRTL ? 'المفضلة' : 'Wishlist', icon: Heart, badge: wishlistCount },
    { href: "/cart", label: isRTL ? 'السلة' : 'Cart', icon: ShoppingCart, badge: cartCount },
  ];



  // Debounced search-as-you-type for mobile
  const handleMobileSearchChange = (value: string) => {
    setMobileSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value.trim()) {
        setLocation(`/?search=${encodeURIComponent(value.trim())}`);
      } else {
        setLocation('/');
      }
    }, 300);
  };

  // Debounced search-as-you-type for desktop
  const handleDesktopSearchChange = (value: string) => {
    setDesktopSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value.trim()) {
        setLocation(`/?search=${encodeURIComponent(value.trim())}`);
      } else {
        setLocation('/');
      }
    }, 300);
  };

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileSearchQuery.trim()) {
      setLocation(`/?search=${encodeURIComponent(mobileSearchQuery.trim())}`);
    }
  };

  const handleDesktopSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (desktopSearchQuery.trim()) {
      setLocation(`/?search=${encodeURIComponent(desktopSearchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-4 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Desktop Logo - Hidden on Mobile */}
            <Link href="/">
              <a className="hidden md:flex items-center gap-3 hover:opacity-80 transition-opacity shrink-0">
                <div className="p-1 bg-white rounded-xl shadow-sm">
                  <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                </div>
                <div className="hidden lg:block">
                  <h1 className="text-xl font-bold text-primary leading-tight">
                    {t('app_name')}
                  </h1>
                </div>
              </a>
            </Link>

            {/* Unified Search Bar - Responsive for both Mobile and Desktop (shown on all non-admin pages) */}
            {!isAdminPage && (
              <div className="flex-1 max-w-lg mx-2 md:mx-6">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (desktopSearchQuery.trim()) {
                    setLocation(`/?search=${encodeURIComponent(desktopSearchQuery.trim())}`);
                  }
                }}>
                  <div className="relative w-full">
                    <Search className={cn(
                      "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",
                      isRTL ? "right-3 md:right-4" : "left-3 md:left-4"
                    )} />
                    <Input
                      className={cn(
                        "h-10 md:h-11 rounded-xl bg-muted/50 border-0 text-sm w-full",
                        isRTL ? "pr-9 md:pr-11 pl-8 md:pl-10" : "pl-9 md:pl-11 pr-8 md:pr-10"
                      )}
                      placeholder={t('search_placeholder')}
                      value={desktopSearchQuery}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDesktopSearchQuery(value);
                        setMobileSearchQuery(value);

                        // Store pre-search location if not already searching
                        if (!preSearchLocation && location !== '/' && !location.startsWith('/?')) {
                          setPreSearchLocation(location);
                        }
                        // On shop page, use instant search via event
                        const isOnShop = location === "/" || location.startsWith("/?");
                        if (isOnShop) {
                          window.dispatchEvent(new CustomEvent('header-search', { detail: value }));
                        } else {
                          // On other pages, debounce navigation to shop
                          if (debounceRef.current) clearTimeout(debounceRef.current);
                          debounceRef.current = setTimeout(() => {
                            if (value.trim()) {
                              setLocation(`/?search=${encodeURIComponent(value.trim())}`);
                            }
                          }, 500);
                        }
                      }}
                    />
                    {desktopSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setDesktopSearchQuery('');
                          setMobileSearchQuery('');
                          window.dispatchEvent(new CustomEvent('header-search', { detail: '' }));
                          // Return to pre-search location if available
                          if (preSearchLocation && preSearchLocation !== '/' && !preSearchLocation.startsWith('/?')) {
                            setLocation(preSearchLocation);
                          }
                          setPreSearchLocation(null);
                        }}
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 p-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-full transition-colors",
                          isRTL ? "left-1.5 md:left-2" : "right-1.5 md:right-2"
                        )}
                      >
                        <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}            {/* Mobile: Logo Menu Trigger */}
            <div className="md:hidden order-first">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <button className="p-1 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <img src="/logo.png" alt="Menu" className="w-10 h-10 object-contain" />
                  </button>
                </SheetTrigger>
                <SheetContent side={isRTL ? "right" : "left"} className="w-[300px] sm:w-[350px] p-0 border-r-0 border-l-0 overflow-y-auto bg-background/95 backdrop-blur-xl">
                  <div className="relative bg-gradient-premium h-40 w-full overflow-hidden">
                    <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px]" />
                    <div className="absolute top-0 right-0 p-32 bg-primary/20 rounded-full blur-3xl transform translate-x-12 -translate-y-12" />
                    <div className="absolute bottom-0 left-0 p-24 bg-accent/20 rounded-full blur-2xl transform -translate-x-8 translate-y-8" />

                    <div className="relative h-full flex flex-col justify-end p-6 z-10">
                      <div className="flex items-end gap-3 translate-y-2">
                        {user ? (
                          <div className="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center text-primary border-4 border-white/50 backdrop-blur-sm">
                            <span className="text-2xl font-bold">
                              {user.firstName?.[0] || user.phoneNumber?.[0] || "U"}
                            </span>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center p-3 border-4 border-white/50 backdrop-blur-sm">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                          </div>
                        )}
                        <div className="mb-1">
                          <h3 className="font-bold text-lg text-foreground leading-tight">
                            {user ? (user.firstName ? `${user.firstName} ${user.lastName}` : isRTL ? 'مرحباً بك' : 'Welcome') : t('app_name')}
                          </h3>
                          <p className="text-xs text-muted-foreground font-medium">
                            {user ? user.phoneNumber : isRTL ? 'زائر' : 'Guest'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-6">
                    {user && (
                      <div className="bg-muted/40 rounded-2xl p-1 border border-border/50">
                        <Link href="/profile">
                          <a onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between p-3 rounded-xl hover:bg-background transition-colors active:scale-[0.98]">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <User className="w-5 h-5" />
                              </div>
                              <span className="font-medium text-sm">{isRTL ? 'إدارة الحساب' : 'Manage Account'}</span>
                            </div>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full">
                              <div className={`transition-transform ${isRTL ? 'rotate-180' : ''}`}>→</div>
                            </Button>
                          </a>
                        </Link>
                      </div>
                    )}

                    <div className="space-y-1">
                      <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {isRTL ? 'القائمة الرئيسية' : 'Main Menu'}
                      </p>
                      {navLinks.map((link) => (
                        <Link key={link.href} href={link.href}>
                          <a
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 card-pressable ${location === link.href
                              ? 'bg-primary/10 text-primary shadow-sm'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                              }`}
                          >
                            <link.icon className="w-5 h-5" />
                            <span>{link.label}</span>
                            {link.badge !== undefined && link.badge > 0 && (
                              <Badge variant="destructive" className="ms-auto h-5 px-1.5 min-w-5 flex items-center justify-center text-[10px] shadow-sm animate-in zoom-in">
                                {link.badge}
                              </Badge>
                            )}
                          </a>
                        </Link>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {isRTL ? 'آخرى' : 'Other'}
                      </p>
                      {!user && (
                        <button
                          onClick={() => {
                            setMobileMenuOpen(false);
                            openLogin();
                          }}
                          className="flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors card-pressable w-full text-left rtl:text-right"
                        >
                          <User className="w-5 h-5" />
                          <span>{t('login')}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background to-transparent">
                    <p className="text-[10px] text-center text-muted-foreground/60">
                      Version 1.0.0 • © {new Date().getFullYear()} {t('app_name')}
                    </p>
                  </div>
                </SheetContent>
              </Sheet>
            </div>



            {/* Mobile: Language & Theme Switchers */}
            <div className="md:hidden order-last flex items-center gap-1">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <a
                    className={cn(
                      "relative flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-200",
                      location === link.href || (link.href === '/' && location === '/shop')
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <link.icon className="w-5 h-5" />
                    <span>{link.label}</span>
                    {link.badge && link.badge > 0 && (
                      <Badge
                        variant="destructive"
                        className="ml-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {link.badge}
                      </Badge>
                    )}
                  </a>
                </Link>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              <LanguageSwitcher />
              {user?.isAdmin && (
                <Link href="/admin">
                  <a className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-200",
                    isAdminPage
                      ? "bg-red-500/10 text-red-600"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}>
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('admin_panel')}</span>
                  </a>
                </Link>
              )}
              {user ? (
                <Link href="/profile">
                  <a className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-200",
                    location === '/profile' || location.startsWith('/profile/')
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/50 hover:bg-muted"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      location === '/profile' || location.startsWith('/profile/')
                        ? "bg-white/20"
                        : "bg-primary/20"
                    )}>
                      <User className={cn(
                        "w-4 h-4",
                        location === '/profile' || location.startsWith('/profile/')
                          ? "text-white"
                          : "text-primary"
                      )} />
                    </div>
                    <span className="text-sm font-medium">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.phoneNumber}</span>
                  </a>
                </Link>
              ) : (
                <button
                  onClick={() => openLogin()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors cursor-pointer border-0"
                >
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">{t('login')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 ios-scroll-fix">
        {children}
      </main>

      {/* Footer - Desktop Only */}
      <footer className="hidden md:block border-t bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-1 bg-white rounded-xl shadow-sm">
                  <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                </div>
                <h3 className="text-lg font-bold text-primary">{t('app_name')}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'أفضل المنتجات بأفضل الأسعار' : 'Best products at the best prices'}
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="font-semibold">{isRTL ? 'روابط سريعة' : 'Quick Links'}</h4>
              <nav className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <a className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {link.label}
                    </a>
                  </Link>
                ))}
              </nav>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h4 className="font-semibold">{isRTL ? 'تواصل معنا' : 'Contact Us'}</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>{isRTL ? 'القاهرة، مصر' : 'Cairo, Egypt'}</p>
                <p dir="ltr">+20 123 456 7890</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} {t('app_name')}. {isRTL ? 'جميع الحقوق محفوظة' : 'All rights reserved.'}</p>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation - Premium Glassmorphic */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Frosted glass background */}
        <div className="absolute inset-0 bg-background/70 backdrop-blur-xl border-t border-white/20 dark:border-white/5" />

        {/* Subtle top highlight */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* Navigation items */}
        <div className="relative flex justify-evenly items-center h-16 px-1">
          {navLinks.map((link) => {
            const isActive = location === link.href;
            const isShopLink = link.href === '/';

            // Shop link clears search when clicked
            const handleNavClick = (e: React.MouseEvent) => {
              if (isShopLink && (desktopSearchQuery || mobileSearchQuery)) {
                e.preventDefault();
                setDesktopSearchQuery('');
                setMobileSearchQuery('');
                setPreSearchLocation(null);
                window.dispatchEvent(new CustomEvent('header-search', { detail: '' }));
                setLocation('/');
              }
            };

            return (
              <Link key={link.href} href={link.href}>
                <a
                  onClick={handleNavClick}
                  className="flex flex-col items-center justify-center gap-0.5 w-16 h-14 relative transition-all duration-200 active:scale-90"
                >
                  {/* Active pill background */}
                  <div
                    className={cn(
                      "absolute inset-x-2 top-1 bottom-4 rounded-2xl transition-all duration-300 ease-out",
                      isActive
                        ? "bg-primary/15 dark:bg-primary/20 scale-100 opacity-100"
                        : "scale-75 opacity-0"
                    )}
                  />

                  {/* Icon container */}
                  <div
                    className={cn(
                      "relative z-10 p-1 transition-all duration-200",
                      isActive && "-translate-y-0.5"
                    )}
                  >
                    <link.icon
                      className={cn(
                        "w-[22px] h-[22px] transition-all duration-200",
                        isActive
                          ? "text-primary stroke-[2.5px]"
                          : "text-muted-foreground stroke-[1.75px]"
                      )}
                    />

                    {/* Badge */}
                    {link.badge !== undefined && link.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm ring-2 ring-background px-1 animate-in zoom-in-75 duration-200">
                        {link.badge > 9 ? '9+' : link.badge}
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      "relative z-10 text-[10px] font-medium transition-all duration-200",
                      isActive
                        ? "text-primary font-semibold"
                        : "text-muted-foreground"
                    )}
                  >
                    {link.label}
                  </span>
                </a>
              </Link>
            );
          })}

          {/* Admin Link - Only for admins */}
          {user?.isAdmin && (
            <Link href="/admin">
              <a className="flex flex-col items-center justify-center gap-0.5 w-16 h-14 relative transition-all duration-200 active:scale-90">
                <div
                  className={cn(
                    "absolute inset-x-2 top-1 bottom-4 rounded-2xl transition-all duration-300 ease-out",
                    location.startsWith('/admin')
                      ? "bg-orange-500/15 scale-100 opacity-100"
                      : "scale-75 opacity-0"
                  )}
                />
                <div className={cn(
                  "relative z-10 p-1 transition-all duration-200",
                  location.startsWith('/admin') && "-translate-y-0.5"
                )}>
                  <LayoutDashboard
                    className={cn(
                      "w-[22px] h-[22px] transition-all duration-200",
                      location.startsWith('/admin')
                        ? "text-orange-600 stroke-[2.5px]"
                        : "text-muted-foreground stroke-[1.75px]"
                    )}
                  />
                </div>
                <span className={cn(
                  "relative z-10 text-[10px] font-medium transition-all duration-200",
                  location.startsWith('/admin')
                    ? "text-orange-600 font-semibold"
                    : "text-muted-foreground"
                )}>
                  {isRTL ? 'الإدارة' : 'Admin'}
                </span>
              </a>
            </Link>
          )}

          {/* Profile Link */}
          <Link href="/profile">
            <a className="flex flex-col items-center justify-center gap-0.5 w-16 h-14 relative transition-all duration-200 active:scale-90">
              <div
                className={cn(
                  "absolute inset-x-2 top-1 bottom-4 rounded-2xl transition-all duration-300 ease-out",
                  (location === '/profile' || location.startsWith('/profile/'))
                    ? "bg-primary/15 dark:bg-primary/20 scale-100 opacity-100"
                    : "scale-75 opacity-0"
                )}
              />
              <div className={cn(
                "relative z-10 p-1 transition-all duration-200",
                (location === '/profile' || location.startsWith('/profile/')) && "-translate-y-0.5"
              )}>
                <User
                  className={cn(
                    "w-[22px] h-[22px] transition-all duration-200",
                    (location === '/profile' || location.startsWith('/profile/'))
                      ? "text-primary stroke-[2.5px]"
                      : "text-muted-foreground stroke-[1.75px]"
                  )}
                />
              </div>
              <span className={cn(
                "relative z-10 text-[10px] font-medium transition-all duration-200",
                (location === '/profile' || location.startsWith('/profile/'))
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              )}>
                {isRTL ? 'حسابي' : 'Profile'}
              </span>
            </a>
          </Link>
        </div>
      </nav>

      {/* Mobile bottom spacing */}
      <div className="md:hidden h-16" />
    </div>
  );
}
