import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/lib/require-auth";
import { Layout } from "@/components/layout";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import NotFound from "@/pages/not-found";
import Shop from "@/pages/shop";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin";
import AuthPage from "@/pages/auth";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Shop} />
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
          <RequireAuth>
            <Admin />
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
