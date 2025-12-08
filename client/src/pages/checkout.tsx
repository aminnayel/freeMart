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
import { CreditCard, MapPin, Banknote, ShoppingBag, CheckCircle2, Package, ArrowRight, Home, Plus, ChevronRight, User } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
  const [currentStep, setCurrentStep] = useState(1);

  // Initialize with user data
  useEffect(() => {
    if (user) {
      if (user.deliveryAddress) {
        setDeliveryType('saved');
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

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderData: {
            totalAmount: totalAmount.toFixed(2),
            paymentMethod,
            deliveryAddress: deliveryType === 'saved' ? user?.deliveryAddress : deliveryAddress,
            city: deliveryType === 'saved' ? user?.city : city,
            postalCode: deliveryType === 'saved' ? user?.postalCode : postalCode,
            phoneNumber: user?.phoneNumber,
            notes,
            status: "pending",
          },
          orderItems,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: t('order_placed'),
        description: t('order_placed_desc'),
      });
      setLocation("/profile");
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('error_place_order'),
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

    // Validation
    if (deliveryType === 'new') {
      if (!deliveryAddress || !city) {
        toast({
          title: t('missing_info'),
          description: t('fill_delivery_details'),
          variant: "destructive",
        });
        return;
      }
    } else if (!user?.deliveryAddress) {
      setDeliveryType('new');
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

    // Save address if new
    if (deliveryType === 'new' && saveAddress) {
      try {
        await updateProfileMutation.mutateAsync({
          deliveryAddress,
          city,
          postalCode,
          phoneNumber: user.phoneNumber,
        });
      } catch (error) {
        console.error("Failed to save address", error);
      }
    }

    createOrderMutation.mutate();
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/20">
        <Card className="p-12 text-center border-none shadow-xl bg-background rounded-[2rem] max-w-lg w-full">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-3">{t('cart_empty')}</h2>
          <p className="text-muted-foreground mb-8 text-lg">{t('add_products_checkout')}</p>
          <Button onClick={() => setLocation("/")} size="lg" className="rounded-full shadow-lg hover:shadow-primary/25 h-14 px-8 text-lg font-bold w-full">
            {t('continue_shopping')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10 pb-32 lg:pb-12 page-transition" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-30 backdrop-blur-xl bg-background/80 w-full">
        <div className="container mx-auto max-w-5xl px-4 py-4 lg:py-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" className="gap-2" onClick={() => setLocation('/cart')}>
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              {t('back_to_cart')}
            </Button>
            <div className="font-bold text-lg hidden sm:block">{t('checkout')}</div>
            <div className="w-24"></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">

          {/* Main Form Section */}
          <div className="lg:col-span-7 space-y-8">
            <form id="checkout-form" onSubmit={handleSubmit} className="space-y-8">

              {/* Step 1: Delivery */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">1</div>
                  <h2 className="text-xl font-bold">{t('delivery_address')}</h2>
                </div>

                <Card className="overflow-hidden border-none shadow-md rounded-3xl bg-card">
                  {user?.deliveryAddress && (
                    <div
                      className={`p-5 flex items-start gap-4 cursor-pointer transition-all border-b border-border/50 ${deliveryType === 'saved' ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                      onClick={() => setDeliveryType('saved')}
                    >
                      <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${deliveryType === 'saved' ? 'border-primary' : 'border-muted-foreground/30'}`}>
                        {deliveryType === 'saved' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Home className="w-4 h-4 text-primary" />
                          <span className="font-bold">{t('saved_address')}</span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed text-sm">
                          {user.deliveryAddress}, {user.city}
                        </p>
                      </div>
                    </div>
                  )}

                  <div
                    className={`p-5 flex items-start gap-4 cursor-pointer transition-all ${deliveryType === 'new' ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setDeliveryType('new')}
                  >
                    <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${deliveryType === 'new' ? 'border-primary' : 'border-muted-foreground/30'}`}>
                      {deliveryType === 'new' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-primary" />
                        <span className="font-bold">{t('add_new_address')}</span>
                      </div>

                      {/* Expanded Form for New Address */}
                      <div className={`grid gap-4 transition-all duration-300 ${deliveryType === 'new' ? 'grid-rows-1 opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 overflow-hidden mt-0'}`}>
                        <div className="space-y-4 min-h-0">
                          <div className="space-y-2">
                            <Label>{t('street_address')}</Label>
                            <Textarea
                              value={deliveryAddress}
                              onChange={(e) => setDeliveryAddress(e.target.value)}
                              placeholder={t('street_address_placeholder')}
                              className="bg-background rounded-xl resize-none"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>{t('city')}</Label>
                              <Input
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="bg-background rounded-xl h-12"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t('postal_code')}</Label>
                              <Input
                                value={postalCode}
                                onChange={(e) => setPostalCode(e.target.value)}
                                className="bg-background rounded-xl h-12"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            <Checkbox id="save-addr" checked={saveAddress} onCheckedChange={(c: boolean) => setSaveAddress(!!c)} />
                            <Label htmlFor="save-addr" className="font-normal cursor-pointer">{t('save_address_future')}</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Step 2: Payment */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">2</div>
                  <h2 className="text-xl font-bold">{t('payment_method')}</h2>
                </div>

                <Card className="overflow-hidden border-none shadow-md rounded-3xl bg-card">
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="gap-0" dir={isRTL ? 'rtl' : 'ltr'}>
                    <div className={`flex items-center p-5 border-b border-border/50 cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'bg-primary/5' : 'hover:bg-muted/50'}`} onClick={() => setPaymentMethod('cod')}>
                      <RadioGroupItem value="cod" id="cod" className="sr-only" />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center me-4 transition-colors ${paymentMethod === 'cod' ? 'border-primary' : 'border-muted-foreground/30'}`}>
                        {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600">
                          <Banknote className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm">{t('cash_on_delivery')}</div>
                          <div className="text-xs text-muted-foreground">{t('pay_when_receive')}</div>
                        </div>
                      </div>
                    </div>
                    <div className={`flex items-center p-5 cursor-pointer transition-colors ${paymentMethod === 'visa' ? 'bg-primary/5' : 'hover:bg-muted/50'}`} onClick={() => setPaymentMethod('visa')}>
                      <RadioGroupItem value="visa" id="visa" className="sr-only" />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center me-4 transition-colors ${paymentMethod === 'visa' ? 'border-primary' : 'border-muted-foreground/30'}`}>
                        {paymentMethod === 'visa' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm">{t('credit_card')}</div>
                          <div className="text-xs text-muted-foreground">{t('pay_securely_online')}</div>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                </Card>
              </div>

              {/* Step 3: Contact Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">3</div>
                  <h2 className="text-xl font-bold">{t('contact_info')}</h2>
                </div>
                <Card className="p-5 border-none shadow-md rounded-3xl bg-card flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-0.5">{t('receiving_order_as')}</div>
                      <div className="font-bold text-lg leading-none flex items-center gap-2">
                        <span dir="ltr">{user?.phoneNumber}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </form>
          </div>

          {/* Sticky Sidebar for Order Summary */}
          <div className="hidden lg:block lg:col-span-5 h-[fit-content] sticky top-24">
            <Card className="border-none shadow-xl bg-card rounded-[2rem] overflow-hidden">
              <div className="p-6 lg:p-8 bg-muted/30">
                <h2 className="text-xl font-bold mb-6">{t('order_summary')}</h2>
                <div className="space-y-4">
                  {cartItems.map((item: any) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-16 h-16 rounded-xl bg-background overflow-hidden flex-shrink-0 border shadow-sm">
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          {(item.product.imageUrl?.startsWith('http') || item.product.imageUrl?.startsWith('/')) ? (
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            item.product.imageUrl || "📦"
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm line-clamp-2">{item.product.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 text-end" dir="ltr">
                          {item.quantity} x {item.product.price}
                        </div>
                      </div>
                      <div className="font-bold text-sm">
                        {(item.quantity * parseFloat(item.product.price)).toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 lg:p-8 space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('subtotal')}</span>
                    <span className="font-medium">{total.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('delivery_fee')}</span>
                    <span className="font-medium text-green-600">{t('free')}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between items-end">
                  <span className="font-bold text-lg">{t('total')}</span>
                  <span className="font-bold text-2xl text-primary">
                    {total.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">{isRTL ? 'ج.م' : 'EGP'}</span>
                  </span>
                </div>

                <Button
                  size="lg"
                  className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg hover:shadow-primary/25 mt-4"
                  onClick={handleSubmit}
                  disabled={createOrderMutation.isPending}
                >
                  {createOrderMutation.isPending ? t('placing_order') : t('place_order')}
                  {!createOrderMutation.isPending && <ArrowRight className={`w-5 h-5 ms-2 ${isRTL ? 'rotate-180' : ''}`} />}
                </Button>

                <p className="text-xs text-center text-muted-foreground px-4">
                  {t('by_placing_order_agree')}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Button & Drawer */}
      <Drawer>
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t lg:hidden z-[100] safe-area-bottom">
          <div className="flex gap-4 items-center">
            <DrawerTrigger asChild>
              <div className="flex-1 cursor-pointer group">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {t('order_summary')} <ChevronUp className="w-3 h-3 group-data-[state=open]:rotate-180 transition-transform" />
                </div>
                <div className="font-bold text-xl text-primary">{total.toFixed(0)} {isRTL ? 'ج.م' : 'EGP'}</div>
              </div>
            </DrawerTrigger>
            <Button
              onClick={handleSubmit}
              disabled={createOrderMutation.isPending}
              className="h-12 px-8 rounded-xl font-bold shadow-lg w-1/2"
            >
              {t('place_order')}
            </Button>
          </div>
        </div>
        <DrawerContent className="pb-24">
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">{t('order_items')}</h3>
            {cartItems.map((item: any) => (
              <div key={item.id} className="flex gap-4">
                <div className="w-16 h-16 rounded-xl bg-background overflow-hidden flex-shrink-0 border shadow-sm">
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    {(item.product.imageUrl?.startsWith('http') || item.product.imageUrl?.startsWith('/')) ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      item.product.imageUrl || "📦"
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm line-clamp-2">{item.product.name}</div>
                  <div className="text-xs text-muted-foreground mt-1 text-end" dir="ltr">
                    {item.quantity} x {item.product.price}
                  </div>
                </div>
                <div className="font-bold text-sm">
                  {(item.quantity * parseFloat(item.product.price)).toFixed(0)}
                </div>
              </div>
            ))}
            <Separator className="my-4" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('subtotal')}</span>
                <span className="font-medium">{total.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('delivery_fee')}</span>
                <span className="font-medium text-green-600">{t('free')}</span>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
