import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, User, Home, Menu, X, LayoutDashboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: cartItems = [] } = useQuery<any[]>({
    queryKey: ["/api/cart"],
    retry: false,
  });

  const cartCount = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);

  // Hide layout for admin pages (admin has its own layout)
  const isAdminPage = location.startsWith('/admin');

  if (isAdminPage) {
    return <>{children}</>;
  }

  const navLinks = [
    { href: "/", label: isRTL ? 'المتجر' : 'Shop', icon: Home },
    { href: "/cart", label: isRTL ? 'السلة' : 'Cart', icon: ShoppingCart, badge: cartCount },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Desktop Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/">
              <a className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="p-1 bg-white rounded-xl shadow-sm">
                  <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold text-primary leading-tight">
                    {t('app_name')}
                  </h1>
                </div>
              </a>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <a
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${location === link.href
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
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
              <LanguageSwitcher />
              {user?.isAdmin && (
                <Link href="/admin">
                  <a className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 rounded-full hover:bg-orange-500/20 transition-colors cursor-pointer">
                    <LayoutDashboard className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-600">{t('admin_panel')}</span>
                  </a>
                </Link>
              )}
              {user ? (
                <Link href="/profile">
                  <a className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full hover:bg-muted transition-colors cursor-pointer">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.phoneNumber}</span>
                  </a>
                </Link>
              ) : (
                <Link href="/auth">
                  <a className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors cursor-pointer">
                    <User className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">{t('login')}</span>
                  </a>
                </Link>
              )}
            </div>

            {/* Mobile Menu Button - Using Sheet Sidebar */}
            <div className="flex md:hidden items-center gap-2">
              <LanguageSwitcher />

              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Menu className="w-6 h-6" />
                  </Button>
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
                        <Link href="/auth">
                          <a
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors card-pressable"
                          >
                            <User className="w-5 h-5" />
                            <span>{t('login')}</span>
                          </a>
                        </Link>
                      )}
                      {/* Could add Support / About links here */}
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

      {/* Mobile Bottom Navigation */}
      {/* Mobile Bottom Navigation - Glassmorphic Premium */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-2xl border-t border-white/10 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] z-50 safe-area-pb no-select transition-all duration-300">
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-50"></div>
        <div className="flex justify-evenly items-center h-[3.75rem] px-2">
          {navLinks.map((link) => {
            const isActive = location === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <a className={`flex flex-col items-center justify-center gap-1 w-16 py-1 transition-all relative group ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  <div className={`relative p-1.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary/10 -translate-y-1' : 'group-active:scale-95'}`}>
                    <link.icon className={`w-6 h-6 transition-all duration-300 ${isActive ? 'fill-primary stroke-primary' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                    {link.badge !== undefined && link.badge > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm ring-2 ring-background animate-in zoom-in">
                        {link.badge > 9 ? '9+' : link.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium transition-all duration-300 ${isActive ? 'opacity-100 font-bold' : 'opacity-70'}`}>
                    {link.label}
                  </span>
                  {isActive && (
                    <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" />
                  )}
                </a>
              </Link>
            );
          })}
          {/* Admin Link - Only for admins */}
          {user?.isAdmin && (
            <Link href="/admin">
              <a className={`flex flex-col items-center justify-center gap-1 w-16 py-1 transition-all relative group ${location.startsWith('/admin') ? 'text-orange-600' : 'text-muted-foreground hover:text-foreground'}`}>
                <div className={`relative p-1.5 rounded-2xl transition-all duration-300 ${location.startsWith('/admin') ? 'bg-orange-500/10 -translate-y-1' : 'group-active:scale-95'}`}>
                  <LayoutDashboard className={`w-6 h-6 transition-all duration-300 ${location.startsWith('/admin') ? 'text-orange-600' : ''}`} strokeWidth={location.startsWith('/admin') ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-medium transition-all duration-300 ${location.startsWith('/admin') ? 'opacity-100 font-bold text-orange-600' : 'opacity-70'}`}>
                  {isRTL ? 'الإدارة' : 'Admin'}
                </span>
                {location.startsWith('/admin') && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-orange-600" />
                )}
              </a>
            </Link>
          )}
          {/* Profile Link */}
          <Link href="/profile">
            <a className={`flex flex-col items-center justify-center gap-1 w-16 py-1 transition-all relative group ${location === '/profile' || location.startsWith('/profile/') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <div className={`relative p-1.5 rounded-2xl transition-all duration-300 ${location === '/profile' || location.startsWith('/profile/') ? 'bg-primary/10 -translate-y-1' : 'group-active:scale-95'}`}>
                <User className={`w-6 h-6 transition-all duration-300 ${location === '/profile' || location.startsWith('/profile/') ? 'fill-primary stroke-primary' : ''}`} strokeWidth={location === '/profile' || location.startsWith('/profile/') ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-medium transition-all duration-300 ${location === '/profile' || location.startsWith('/profile/') ? 'opacity-100 font-bold' : 'opacity-70'}`}>
                {isRTL ? 'حسابي' : 'Profile'}
              </span>
              {(location === '/profile' || location.startsWith('/profile/')) && (
                <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </a>
          </Link>
        </div>
      </nav>

      {/* Mobile bottom spacing */}
      <div className="md:hidden h-16" />
    </div>
  );
}
