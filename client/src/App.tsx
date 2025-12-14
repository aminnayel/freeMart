import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/lib/require-auth";
import { RequireAdmin } from "@/lib/require-admin";
import { Layout } from "@/components/layout";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { NotificationPrompt } from "@/components/notification-prompt";
import { AuthModal } from "@/components/auth/auth-modal";
import { AuthModalProvider } from "@/components/auth/auth-modal-context";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import Shop from "@/pages/shop";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin";
import AuthPage from "@/pages/auth";
import OrderDetails from "@/pages/order-details";
import Wishlist from "@/pages/wishlist";

import { useEffect } from "react";
import { useLocation } from "wouter";
import i18n from "@/lib/i18n";

function ScrollToTop() {
  const [pathname] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function LanguageHandler() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get("language");
    if (lang === "ar" || lang === "en") {
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang);
        const dir = lang === "ar" ? "rtl" : "ltr";
        document.documentElement.dir = dir;
        document.documentElement.lang = lang;
      }
    }
  }, []);

  return null;
}

function Router() {
  return (
    <Layout>
      <ScrollToTop />
      <LanguageHandler />
      <Switch>
        <Route path="/" component={Shop} />
        <Route path="/shop" component={Shop} />
        <Route path="/cart" component={Cart} />
        <Route path="/wishlist" component={Wishlist} />
        <Route path="/checkout">
          <RequireAuth>
            <Checkout />
          </RequireAuth>
        </Route>
        <Route path="/profile">
          <RequireAuth>
            <Profile />
          </RequireAuth>
        </Route>
        <Route path="/profile/:section">
          <RequireAuth>
            <Profile />
          </RequireAuth>
        </Route>
        <Route path="/admin">
          <RequireAdmin>
            <Admin />
          </RequireAdmin>
        </Route>
        <Route path="/orders/:id">
          <RequireAuth>
            <OrderDetails />
          </RequireAuth>
        </Route>
        <Route path="/auth" component={AuthPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthModalProvider>
            <Toaster />
            <Router />
            <PWAInstallPrompt />
            <NotificationPrompt />
            <AuthModal />
          </AuthModalProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
