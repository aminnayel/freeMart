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
import NotFound from "@/pages/not-found";
import Shop from "@/pages/shop";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin";
import AuthPage from "@/pages/auth";
import OrderDetails from "@/pages/order-details";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Shop} />
        <Route path="/shop" component={Shop} />
        <Route path="/cart" component={Cart} />
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <PWAInstallPrompt />
        <NotificationPrompt />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
