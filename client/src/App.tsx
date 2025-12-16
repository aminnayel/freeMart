import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RequireAuth } from "@/lib/require-auth";
import { RequireAdmin } from "@/lib/require-admin";
import { Layout } from "@/components/layout";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { NotificationPrompt } from "@/components/notification-prompt";
import { AuthModal } from "@/components/auth/auth-modal";
import { AuthModalProvider } from "@/components/auth/auth-modal-context";
import { ThemeProvider } from "@/components/theme-provider";
import { useEffect, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import i18n from "@/lib/i18n";
import { Loader2 } from "lucide-react";

// Lazy load pages
const NotFound = lazy(() => import("@/pages/not-found"));
const Shop = lazy(() => import("@/pages/shop"));
const Cart = lazy(() => import("@/pages/cart"));
const Checkout = lazy(() => import("@/pages/checkout"));
const Profile = lazy(() => import("@/pages/profile"));
const Admin = lazy(() => import("@/pages/admin"));
const AuthPage = lazy(() => import("@/pages/auth"));
const OrderDetails = lazy(() => import("@/pages/order-details"));
const OrderConfirmation = lazy(() => import("@/pages/order-confirmation"));
const Wishlist = lazy(() => import("@/pages/wishlist"));

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

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <ScrollToTop />
      <LanguageHandler />
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/order-confirmation/:orderId">
            <RequireAuth>
              <OrderConfirmation />
            </RequireAuth>
          </Route>
          <Route path="/auth" component={AuthPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
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
