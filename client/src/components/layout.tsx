import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, User, Home, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { t } = useTranslation();

  // Removed authentication user query to allow guest access without requiring login.
  // const { data: user } = useQuery({
  //   queryKey: ["/api/auth/user"],
  //   retry: false,
  //   throwOnError: false,
  // });

  const { data: cartItems = [] } = useQuery<any[]>({
    queryKey: ["/api/cart"],
    retry: false,
  });

  const cartCount = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);

  // Show user's name if authenticated, otherwise show generic profile label
  const profileLabel = t('nav_profile');

  const navItems = [
    { href: "/", label: t('nav_shop'), icon: Home },
    { href: "/cart", label: t('nav_cart'), icon: ShoppingCart, badge: cartCount },
    { href: "/profile", label: profileLabel, icon: User },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <a className="flex items-center gap-2">
                <Package className="w-8 h-8 text-primary" />
                <h1 className="text-2xl font-bold text-primary">{t('app_name')}</h1>
              </a>
            </Link>
            <div className="flex items-center gap-4">
              <nav className="flex items-center gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;
                  return (
                    <Button
                      key={item.href}
                      variant={isActive ? "default" : "ghost"}
                      asChild
                      className="relative"
                      data-testid={`nav-${item.label?.toLowerCase()}`}
                    >
                      <Link href={item.href}>
                        <a className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="hidden sm:inline">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <Badge
                              variant="destructive"
                              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </a>
                      </Link>
                    </Button>
                  );
                })}
              </nav>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
