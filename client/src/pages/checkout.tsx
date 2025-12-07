import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { CreditCard, MapPin, Banknote, ShoppingBag, CheckCircle2, Package, ArrowRight, ChevronRight, Home, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';

  const { data: cartItems = [] } = useQuery<any[]>({
    queryKey: ["/api/cart"],
  });

  const [deliveryType, setDeliveryType] = useState<'saved' | 'new'>('saved');
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [notes, setNotes] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);

  // Initialize with user data
  useEffect(() => {
    if (user) {
      if (user.deliveryAddress) {
        setDeliveryType('saved');
        // Still populate state for submission
        setDeliveryAddress(user.deliveryAddress);
        setCity(user.city || "");
        setPostalCode(user.postalCode || "");
      } else {
        setDeliveryType('new');
      }
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const totalAmount = cartItems.reduce(
        (sum: number, item: any) => sum + parseFloat(item.product.price) * item.quantity,
        0
      );

      const orderItems = cartItems.map((item: any) => ({
        productId: item.productId,
        productName: item.product.name,
        productPrice: item.product.price,
        quantity: item.quantity,
        subtotal: (parseFloat(item.product.price) * item.quantity).toFixed(2),
      }));

      // Use either the new entered address or the saved one depending on current state
      // But we are syncing state anyway, so just use state variables.
      // Important: PhoneNumber is ALWAYS from the user profile now.

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderData: {
            totalAmount: totalAmount.toFixed(2),
            paymentMethod,
            deliveryAddress,
            city,
            postalCode,
            phoneNumber: user?.phoneNumber, // Always use registered phone
            notes,
            status: "pending",
          },
          orderItems,
        }),
      });
      if (!res.ok) throw new Error("Failed to create order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: t('order_placed'),
        description: t('order_placed_desc'),
      });
      setLocation("/profile"); // Redirect to orders/profile
    },
    onError: () => {
      toast({
        title: t('error'),
        description: t('error_place_order'),
        variant: "destructive",
      });
    },
  });

  const total = cartItems.reduce(
    (sum: number, item: any) => sum + parseFloat(item.product.price) * item.quantity,
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Address Validation
    if (!deliveryAddress || !city) {
      toast({
        title: t('missing_info'),
        description: t('fill_delivery_details'),
        variant: "destructive",
      });
      return;
    }

    if (!user?.phoneNumber) {
      toast({
        title: t('missing_info'),
        description: t('phone_number_missing'),
        variant: "destructive"
      });
      return;
    }

    // Save address if it's a new one and checkbox is checked
    if (deliveryType === 'new' && saveAddress) {
      try {
        await updateProfileMutation.mutateAsync({
          deliveryAddress,
          city,
          postalCode,
          phoneNumber: user.phoneNumber, // Don't change phone, keep existing
        });
      } catch (error) {
        console.error("Failed to save address", error);
      }
    }

    createOrderMutation.mutate();
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto min-h-[60vh] flex flex-col items-center justify-center p-6">
        <Card className="p-8 text-center border-none shadow-xl bg-white/50 backdrop-blur-xl rounded-3xl w-full">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t('cart_empty')}</h2>
          <p className="text-muted-foreground mb-8">{t('add_products_checkout')}</p>
          <Button onClick={() => setLocation("/")} size="lg" className="rounded-2xl shadow-lg w-full sm:w-auto px-8">
            {t('continue_shopping')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10 pb-40 lg:pb-10 page-transition" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Checkout Header - Fixed below main navbar */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-xl border-b shadow-sm">
        <div className="container mx-auto max-w-2xl text-center relative py-4">
          <h1 className="text-lg font-bold">{t('checkout')}</h1>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 max-w-xs mx-auto pb-3">
          <div className="h-1 flex-1 bg-primary rounded-full"></div>
          <div className="h-1 flex-1 bg-primary rounded-full"></div>
          <div className="h-1 flex-1 bg-muted rounded-full"></div>
        </div>
        <div className="flex justify-between max-w-xs mx-auto text-[10px] text-muted-foreground px-1 font-medium pb-3">
          <span>{t('cart')}</span>
          <span className="text-primary">{t('checkout')}</span>
          <span>{t('confirmation')}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-5">
        <form id="checkout-form" onSubmit={handleSubmit}>

          {/* Delivery Section - Card Style */}
          <section className="space-y-3 pt-2">
            <h2 className="text-sm font-bold text-muted-foreground px-1 uppercase tracking-wider">{t('delivery_address')}</h2>
            <Card className="overflow-hidden border-none shadow-sm bg-white dark:bg-slate-900 rounded-2xl">
              {/* Options Logic */}
              {user?.deliveryAddress && (
                <div
                  className={`p-4 flex items-center gap-4 cursor-pointer transition-colors border-b last:border-0 ${deliveryType === 'saved' ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => {
                    setDeliveryType('saved');
                    setDeliveryAddress(user.deliveryAddress || "");
                    setCity(user.city || "");
                    setPostalCode(user.postalCode || "");
                  }}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${deliveryType === 'saved' ? 'border-primary' : 'border-muted-foreground'}`}>
                    {deliveryType === 'saved' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Home className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm">{t('saved_address')}</span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-snug line-clamp-2">{user.deliveryAddress}, {user.city}</p>
                  </div>
                </div>
              )}

              <div
                className={`p-4 flex items-center gap-4 cursor-pointer transition-colors ${deliveryType === 'new' ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                onClick={() => {
                  setDeliveryType('new');
                  setDeliveryAddress("");
                  setCity("");
                  setPostalCode("");
                }}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${deliveryType === 'new' ? 'border-primary' : 'border-muted-foreground'}`}>
                  {deliveryType === 'new' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">{t('add_new_address')}</span>
                  </div>
                </div>
              </div>

              {/* Form fields only show when New Address is active OR editing */}
              {deliveryType === 'new' && (
                <div className="p-4 pt-0 space-y-4 animate-in slide-in-from-top-2">
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label className="text-xs">{t('street_address')}</Label>
                      <Textarea
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder={t('street_address_placeholder')}
                        className="bg-muted/30 border-transparent focus:bg-background rounded-xl resize-none min-h-[80px]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">{t('city')}</Label>
                        <Input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder={t('city')}
                          className="bg-muted/30 border-transparent focus:bg-background rounded-xl h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">{t('postal_code')}</Label>
                        <Input
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder={t('postal_code')}
                          className="bg-muted/30 border-transparent focus:bg-background rounded-xl h-11"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Checkbox
                        id="save-new"
                        checked={saveAddress}
                        onCheckedChange={(c) => setSaveAddress(!!c)}
                      />
                      <Label htmlFor="save-new" className="text-xs cursor-pointer">{t('save_address_future')}</Label>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </section>

          {/* Payment Section */}
          <section className="space-y-3 pt-2">
            <h2 className="text-sm font-bold text-muted-foreground px-1 uppercase tracking-wider">{t('payment_method')}</h2>
            <Card className="overflow-hidden border-none shadow-sm bg-white dark:bg-slate-900 rounded-2xl">
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="gap-0" dir={isRTL ? 'rtl' : 'ltr'}>
                {[
                  { id: 'cod', icon: Banknote, label: t('cash_on_delivery') },
                  { id: 'visa', icon: CreditCard, label: t('credit_card') },
                ].map((method) => (
                  <div key={method.id} className={`flex items-center p-4 border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors ${paymentMethod === method.id ? 'bg-primary/5' : ''}`} onClick={() => setPaymentMethod(method.id)}>
                    <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center me-4 ${paymentMethod === method.id ? 'border-primary' : 'border-muted-foreground'}`}>
                      {paymentMethod === method.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <method.icon className="w-5 h-5 text-muted-foreground me-3" />
                    <span className="font-medium text-sm flex-1 text-start">{method.label}</span>
                  </div>
                ))}
              </RadioGroup>
            </Card>
          </section>

          {/* User Phone Confirmation (Read Only View) */}
          <section className="space-y-3 pt-2">
            <h2 className="text-sm font-bold text-muted-foreground px-1 uppercase tracking-wider">{t('contact_info')}</h2>
            <Card className="p-4 border-none shadow-sm bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('phone_number')}</p>
                <p className="font-mono font-medium text-lg leading-none" dir="ltr">{user?.phoneNumber}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" asChild>
                <a href="/profile">{t('edit')}</a>
              </Button>
            </Card>
          </section>

          {/* Order Summary Compact */}
          <section className="space-y-3 pt-2">
            <h2 className="text-sm font-bold text-muted-foreground px-1 uppercase tracking-wider">{t('order_summary')}</h2>
            <Card className="p-4 border-none shadow-sm bg-white dark:bg-slate-900 rounded-2xl">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('subtotal')}</span>
                  <span>{total.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>{t('shipping')}</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t('free')}</span>
                </div>
                <div className="border-t border-dashed pt-3 mt-3 flex justify-between items-end">
                  <span className="font-bold">{t('total')}</span>
                  <span className="text-xl font-bold text-primary">{total.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">{isRTL ? 'ج.م' : 'EGP'}</span></span>
                </div>
              </div>
            </Card>
          </section>

        </form>
      </div>

      {/* Sticky Bottom Action - Above mobile navbar */}
      <div className="fixed bottom-20 lg:bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t shadow-lg z-40 safe-area-pb">
        <div className="container max-w-3xl mx-auto">
          <Button
            size="lg"
            className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl shadow-primary/20"
            onClick={handleSubmit}
            disabled={createOrderMutation.isPending}
          >
            {createOrderMutation.isPending ? t('placing_order') : t('place_order')}
            {!createOrderMutation.isPending && <ArrowRight className={`w-5 h-5 ms-2 ${isRTL ? 'rotate-180' : ''}`} />}
          </Button>
        </div>
      </div>

    </div>
  );
}
