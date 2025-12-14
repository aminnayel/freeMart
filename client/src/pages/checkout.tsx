import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { CreditCard, MapPin, Banknote, ShoppingBag, CheckCircle2, Package, ArrowRight, ArrowLeft, Home, Plus, ChevronRight, User, Truck, Shield, Receipt, Clock, Tag, Loader2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronUp } from "lucide-react";
import { translateContent } from "@/lib/translator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DeliveryZone {
  id: number;
  name: string;
  englishName: string | null;
  deliveryFee: string;
  minimumOrder: string;
  estimatedMinutes: number;
  isActive: boolean;
}

interface DeliverySlot {
  id: number;
  startTime: string;
  endTime: string;
  maxOrders: number;
  surcharge: string;
  isActive: boolean;
}

interface PromoValidation {
  valid: boolean;
  discount: number;
  message: string;
  promoCode?: any;
}

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

  // Fetch delivery zones
  const { data: deliveryZones = [] } = useQuery<DeliveryZone[]>({
    queryKey: ["/api/delivery-zones"],
  });

  // Fetch delivery slots
  const { data: deliverySlots = [] } = useQuery<DeliverySlot[]>({
    queryKey: ["/api/delivery-slots"],
  });

  const [deliveryType, setDeliveryType] = useState<'saved' | 'new'>('saved');
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [notes, setNotes] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);

  // New state for delivery zones, slots, and promo
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoValidation, setPromoValidation] = useState<PromoValidation | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  const getProductName = (product: any) => {
    if (i18n.language === 'en' && product.englishName) {
      return product.englishName;
    }
    return translateContent(product.name, i18n.language);
  };

  const getZoneName = (zone: DeliveryZone) => {
    if (i18n.language === 'en' && zone.englishName) {
      return zone.englishName;
    }
    return zone.name;
  };

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

  // Auto-select first zone if available
  useEffect(() => {
    if (deliveryZones.length > 0 && !selectedZoneId) {
      setSelectedZoneId(deliveryZones[0].id);
    }
  }, [deliveryZones, selectedZoneId]);

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

  // Calculate totals
  const subtotal = cartItems.reduce(
    (sum: number, item: any) => sum + parseFloat(item.product.price) * item.quantity,
    0
  );

  const selectedZone = deliveryZones.find(z => z.id === selectedZoneId);
  const selectedSlot = deliverySlots.find(s => s.id === selectedSlotId);

  const deliveryFee = selectedZone ? parseFloat(selectedZone.deliveryFee) : 0;
  const slotSurcharge = selectedSlot ? parseFloat(selectedSlot.surcharge) : 0;
  const promoDiscount = promoValidation?.valid ? promoValidation.discount : 0;

  const total = subtotal + deliveryFee + slotSurcharge - promoDiscount;
  const minimumOrder = selectedZone ? parseFloat(selectedZone.minimumOrder) : 0;
  const canPlaceOrder = subtotal >= minimumOrder;

  // Validate promo code
  const validatePromoCode = async () => {
    if (!promoCode.trim()) return;

    setIsValidatingPromo(true);
    try {
      const res = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: promoCode, orderTotal: subtotal }),
      });
      const result = await res.json();
      setPromoValidation(result);

      if (result.valid) {
        toast({
          title: isRTL ? "تم التطبيق!" : "Applied!",
          description: result.message,
        });
      } else {
        toast({
          title: isRTL ? "كود غير صالح" : "Invalid Code",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "فشل التحقق من الكود" : "Failed to validate code",
        variant: "destructive",
      });
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const createOrderMutation = useMutation({
    mutationFn: async () => {
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
            totalAmount: total.toFixed(2),
            subtotal: subtotal.toFixed(2),
            deliveryFee: deliveryFee.toFixed(2),
            discount: promoDiscount.toFixed(2),
            paymentMethod,
            paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
            deliveryAddress: deliveryType === 'saved' ? user?.deliveryAddress : deliveryAddress,
            city: deliveryType === 'saved' ? user?.city : city,
            postalCode: deliveryType === 'saved' ? user?.postalCode : postalCode,
            phoneNumber: user?.phoneNumber,
            deliveryZoneId: selectedZoneId,
            deliverySlotId: selectedSlotId,
            promoCodeId: promoValidation?.promoCode?.id || null,
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: t('order_placed'),
        description: t('order_placed_desc'),
      });
      // Redirect to order confirmation page with order ID
      setLocation(`/order-confirmation/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('error_place_order'),
        variant: "destructive",
      });
    },
  });

  const totalItems = cartItems.length;

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

    if (!canPlaceOrder) {
      toast({
        title: isRTL ? "الحد الأدنى للطلب" : "Minimum Order",
        description: isRTL
          ? `الحد الأدنى للطلب ${minimumOrder} جنيه لهذه المنطقة`
          : `Minimum order for this zone is ${minimumOrder} EGP`,
        variant: "destructive",
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

  // Empty Cart
  if (cartItems.length === 0) {
    return (
      <div className="min-h-[70vh] lg:min-h-[80vh] flex flex-col items-center justify-center p-6 text-center page-transition">
        <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mb-6 shadow-xl">
          <ShoppingBag className="w-12 h-12 lg:w-16 lg:h-16 text-primary" />
        </div>
        <h2 className="text-2xl lg:text-4xl font-bold mb-3">{t('cart_empty')}</h2>
        <p className="text-muted-foreground mb-8 text-sm lg:text-lg max-w-md">{t('add_products_checkout')}</p>
        <Button asChild size="lg" className="h-12 lg:h-14 px-8 lg:px-12 rounded-full shadow-xl text-base lg:text-lg">
          <Link href="/">{t('continue_shopping')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background page-transition">
      {/* Header - Fixed below main navbar */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-xl border-b shadow-sm w-full">
        <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-4 lg:py-5">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setLocation('/cart')}>
              <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
            <div className="p-2.5 lg:p-3 bg-primary/10 rounded-xl">
              <Receipt className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl lg:text-3xl font-bold">{t('checkout')}</h1>
              <p className="text-sm text-muted-foreground hidden lg:block">
                {totalItems} {isRTL ? 'منتج في طلبك' : 'items in your order'}
              </p>
            </div>
            <Badge variant="secondary" className="lg:hidden text-sm px-3 py-1 rounded-full ms-auto">
              {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-6 lg:py-10">

        {/* Step Progress Indicator */}
        <div className="mb-6 lg:mb-8">
          <div className="flex items-center justify-between max-w-xl mx-auto px-2">
            {[
              { icon: Truck, label: isRTL ? 'المنطقة' : 'Zone', done: !!selectedZoneId },
              { icon: Clock, label: isRTL ? 'الوقت' : 'Time', done: !!selectedSlotId },
              { icon: MapPin, label: isRTL ? 'العنوان' : 'Address', done: deliveryType === 'saved' ? !!user?.deliveryAddress : (!!deliveryAddress && !!city) },
              { icon: CreditCard, label: isRTL ? 'الدفع' : 'Payment', done: !!paymentMethod },
            ].map((step, idx, arr) => (
              <div key={idx} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${step.done
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                      : 'bg-muted text-muted-foreground'
                    }`}>
                    {step.done ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-1.5 font-medium ${step.done ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-colors ${step.done ? 'bg-green-500' : 'bg-muted'
                    }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-10">

          {/* Form Section - Left Column */}
          <div className="lg:col-span-8 space-y-6 lg:space-y-8 pb-40 lg:pb-8">

            {/* Step 1: Delivery Zone Selection */}
            <Card className="border-0 shadow-md lg:shadow-lg bg-white dark:bg-slate-900 rounded-2xl lg:rounded-3xl overflow-hidden p-5 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg lg:text-xl font-bold">{isRTL ? 'منطقة التوصيل' : 'Delivery Zone'}</h2>
                  <p className="text-sm text-muted-foreground">{isRTL ? 'اختر منطقتك' : 'Select your delivery area'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {deliveryZones.map((zone) => (
                  <div
                    key={zone.id}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedZoneId === zone.id
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-muted/30 hover:bg-muted/50'
                      }`}
                    onClick={() => setSelectedZoneId(zone.id)}
                  >
                    <div className="font-semibold text-sm mb-1">{getZoneName(zone)}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      {parseFloat(zone.deliveryFee) > 0
                        ? `${zone.deliveryFee} ${isRTL ? 'جنيه' : 'EGP'}`
                        : (isRTL ? 'مجاناً' : 'Free')
                      }
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      ~{zone.estimatedMinutes} {isRTL ? 'دقيقة' : 'min'}
                    </div>
                    {parseFloat(zone.minimumOrder) > 0 && (
                      <div className="text-xs text-orange-600 mt-1">
                        {isRTL ? 'حد أدنى' : 'Min'}: {zone.minimumOrder}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selectedZone && subtotal < minimumOrder && (
                <div className="mt-4 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-700 dark:text-orange-300 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {isRTL
                    ? `أضف ${(minimumOrder - subtotal).toFixed(0)} جنيه للوصول للحد الأدنى`
                    : `Add ${(minimumOrder - subtotal).toFixed(0)} EGP to reach minimum order`
                  }
                </div>
              )}
            </Card>

            {/* Step 2: Delivery Time Slot */}
            <Card className="border-0 shadow-md lg:shadow-lg bg-white dark:bg-slate-900 rounded-2xl lg:rounded-3xl overflow-hidden p-5 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg lg:text-xl font-bold">{isRTL ? 'موعد التوصيل' : 'Delivery Time'}</h2>
                  <p className="text-sm text-muted-foreground">{isRTL ? 'اختر وقت مناسب' : 'Choose a convenient time'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {deliverySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedSlotId === slot.id
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-muted/30 hover:bg-muted/50'
                      }`}
                    onClick={() => setSelectedSlotId(slot.id)}
                  >
                    <div className="font-semibold text-sm mb-1" dir="ltr">
                      {slot.startTime} - {slot.endTime}
                    </div>
                    {parseFloat(slot.surcharge) > 0 && (
                      <div className="text-xs text-orange-600">
                        +{slot.surcharge} {isRTL ? 'جنيه' : 'EGP'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Step 3: Delivery Address */}
            <Card className="border-0 shadow-md lg:shadow-lg bg-white dark:bg-slate-900 rounded-2xl lg:rounded-3xl overflow-hidden p-5 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg lg:text-xl font-bold">{t('delivery_address')}</h2>
                  <p className="text-sm text-muted-foreground">{isRTL ? 'أين نوصل طلبك؟' : 'Where should we deliver?'}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Saved Address Option */}
                {user?.deliveryAddress && (
                  <div
                    className={`p-4 lg:p-5 rounded-2xl border-2 cursor-pointer transition-all ${deliveryType === 'saved'
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-muted/30 hover:bg-muted/50'
                      }`}
                    onClick={() => setDeliveryType('saved')}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${deliveryType === 'saved' ? 'border-primary' : 'border-muted-foreground/30'
                        }`}>
                        {deliveryType === 'saved' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Home className="w-4 h-4 text-primary" />
                          <span className="font-bold">{t('saved_address')}</span>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {user.deliveryAddress}, {user.city}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* New Address Option */}
                <div
                  className={`p-4 lg:p-5 rounded-2xl border-2 cursor-pointer transition-all ${deliveryType === 'new'
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-muted/30 hover:bg-muted/50'
                    }`}
                  onClick={() => setDeliveryType('new')}
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${deliveryType === 'new' ? 'border-primary' : 'border-muted-foreground/30'
                      }`}>
                      {deliveryType === 'new' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Plus className="w-4 h-4 text-primary" />
                        <span className="font-bold">{t('add_new_address')}</span>
                      </div>

                      {/* Expanded Form */}
                      <div className={`space-y-4 transition-all duration-300 ${deliveryType === 'new' ? 'opacity-100 mt-2' : 'hidden'
                        }`}>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">{t('street_address')}</Label>
                          <Textarea
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            placeholder={t('street_address_placeholder')}
                            className="bg-background rounded-xl resize-none min-h-[80px]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('city')}</Label>
                            <Input
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              className="bg-background rounded-xl h-12"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('postal_code')}</Label>
                            <Input
                              value={postalCode}
                              onChange={(e) => setPostalCode(e.target.value)}
                              className="bg-background rounded-xl h-12"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                          <Checkbox
                            id="save-addr"
                            checked={saveAddress}
                            onCheckedChange={(c: boolean) => setSaveAddress(!!c)}
                          />
                          <Label htmlFor="save-addr" className="font-normal cursor-pointer text-sm">
                            {t('save_address_future')}
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Step 4: Promo Code */}
            <Card className="border-0 shadow-md lg:shadow-lg bg-white dark:bg-slate-900 rounded-2xl lg:rounded-3xl overflow-hidden p-5 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Tag className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg lg:text-xl font-bold">{isRTL ? 'كود الخصم' : 'Promo Code'}</h2>
                  <p className="text-sm text-muted-foreground">{isRTL ? 'أدخل كود الخصم إن وجد' : 'Enter promo code if you have one'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Input
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    setPromoValidation(null);
                  }}
                  placeholder={isRTL ? "أدخل الكود" : "Enter code"}
                  className="bg-background rounded-xl h-12 flex-1 uppercase"
                />
                <Button
                  onClick={validatePromoCode}
                  disabled={!promoCode.trim() || isValidatingPromo}
                  className="h-12 px-6 rounded-xl"
                >
                  {isValidatingPromo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    isRTL ? 'تطبيق' : 'Apply'
                  )}
                </Button>
              </div>

              {promoValidation && (
                <div className={`mt-4 p-3 rounded-xl text-sm flex items-center gap-2 ${promoValidation.valid
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}>
                  {promoValidation.valid ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                  {promoValidation.message}
                  {promoValidation.valid && (
                    <span className="ms-auto font-bold">
                      -{promoValidation.discount.toFixed(0)} {isRTL ? 'جنيه' : 'EGP'}
                    </span>
                  )}
                </div>
              )}
            </Card>

            {/* Step 5: Payment Method */}
            <Card className="border-0 shadow-md lg:shadow-lg bg-white dark:bg-slate-900 rounded-2xl lg:rounded-3xl overflow-hidden p-5 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg lg:text-xl font-bold">{t('payment_method')}</h2>
                  <p className="text-sm text-muted-foreground">{isRTL ? 'كيف تريد الدفع؟' : 'How would you like to pay?'}</p>
                </div>
              </div>

              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3" dir={isRTL ? 'rtl' : 'ltr'}>
                <div
                  className={`p-4 lg:p-5 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'cod'
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-muted/30 hover:bg-muted/50'
                    }`}
                  onClick={() => setPaymentMethod('cod')}
                >
                  <div className="flex items-center gap-4">
                    <RadioGroupItem value="cod" id="cod" className="sr-only" />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMethod === 'cod' ? 'border-primary' : 'border-muted-foreground/30'
                      }`}>
                      {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-900/30">
                      <Banknote className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold">{t('cash_on_delivery')}</div>
                      <div className="text-xs text-muted-foreground">{t('pay_when_receive')}</div>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 lg:p-5 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'visa'
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-muted/30 hover:bg-muted/50'
                    }`}
                  onClick={() => setPaymentMethod('visa')}
                >
                  <div className="flex items-center gap-4">
                    <RadioGroupItem value="visa" id="visa" className="sr-only" />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMethod === 'visa' ? 'border-primary' : 'border-muted-foreground/30'
                      }`}>
                      {paymentMethod === 'visa' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold">{t('credit_card')}</div>
                      <div className="text-xs text-muted-foreground">{t('pay_securely_online')}</div>
                    </div>
                    <Badge variant="secondary" className="text-xs">{isRTL ? 'قريباً' : 'Coming Soon'}</Badge>
                  </div>
                </div>
              </RadioGroup>
            </Card>

            {/* Step 6: Contact Info */}
            <Card className="border-0 shadow-md lg:shadow-lg bg-white dark:bg-slate-900 rounded-2xl lg:rounded-3xl overflow-hidden p-5 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg lg:text-xl font-bold">{t('contact_info')}</h2>
                  <p className="text-sm text-muted-foreground">{isRTL ? 'معلومات التواصل' : 'Your contact details'}</p>
                </div>
              </div>

              <div className="p-4 lg:p-5 rounded-2xl bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t('receiving_order_as')}</div>
                    <div className="font-bold text-lg" dir="ltr">{user?.phoneNumber}</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Desktop Order Summary - Right Sidebar */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-28 space-y-6">
              {/* Order Summary Card */}
              <Card className="p-8 border-0 shadow-2xl bg-white dark:bg-slate-900 rounded-3xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl">
                    <ShoppingBag className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">{t('order_summary') || 'Order Summary'}</h2>
                </div>

                {/* Order Items */}
                <div className="space-y-4 mb-6 max-h-[200px] overflow-y-auto">
                  {cartItems.map((item: any) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                        {(item.product.imageUrl?.startsWith('http') || item.product.imageUrl?.startsWith('/')) ? (
                          <img
                            src={item.product.imageUrl}
                            alt={getProductName(item.product)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            {item.product.imageUrl || <Package className="w-6 h-6 text-muted-foreground" />}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm line-clamp-1">{getProductName(item.product)}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">
                          {item.quantity} × {item.product.price}
                        </div>
                      </div>
                      <div className="font-bold text-sm text-primary">
                        {(item.quantity * parseFloat(item.product.price)).toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 mb-8 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('subtotal')} ({totalItems} {isRTL ? 'منتج' : 'items'})</span>
                    <span className="font-semibold">{subtotal.toFixed(0)} {isRTL ? 'جنيه' : 'EGP'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isRTL ? 'التوصيل' : 'Delivery'}</span>
                    <span className={`font-semibold ${deliveryFee === 0 ? 'text-green-600' : ''}`}>
                      {deliveryFee === 0 ? (isRTL ? 'مجاناً' : 'Free') : `${deliveryFee.toFixed(0)} ${isRTL ? 'جنيه' : 'EGP'}`}
                    </span>
                  </div>
                  {slotSurcharge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{isRTL ? 'رسوم الوقت' : 'Time Slot'}</span>
                      <span className="font-semibold">{slotSurcharge.toFixed(0)} {isRTL ? 'جنيه' : 'EGP'}</span>
                    </div>
                  )}
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{isRTL ? 'خصم الكود' : 'Promo Discount'}</span>
                      <span className="font-semibold">-{promoDiscount.toFixed(0)} {isRTL ? 'جنيه' : 'EGP'}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-dashed pt-4 flex justify-between">
                    <span className="text-xl font-bold">{t('total')}</span>
                    <span className="text-2xl font-bold text-primary">
                      {total.toFixed(0)} <span className="text-base font-medium">{isRTL ? 'جنيه' : 'EGP'}</span>
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full h-14 text-lg font-semibold shadow-xl hover:shadow-primary/30 transition-all rounded-2xl group"
                  onClick={handleSubmit}
                  disabled={createOrderMutation.isPending || !canPlaceOrder}
                >
                  {createOrderMutation.isPending ? t('placing_order') : t('place_order')}
                  {!createOrderMutation.isPending && (
                    <ArrowRight className={`w-6 h-6 ms-3 group-hover:translate-x-2 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-2' : ''}`} />
                  )}
                </Button>

                {!canPlaceOrder && (
                  <p className="text-center text-sm text-orange-600 mt-3">
                    {isRTL ? `الحد الأدنى للطلب ${minimumOrder} جنيه` : `Minimum order: ${minimumOrder} EGP`}
                  </p>
                )}
              </Card>

              {/* Trust Badges */}
              <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-muted/50 to-muted/20 rounded-2xl">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-2">
                    <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                      <Truck className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-xs font-medium">{isRTL ? 'توصيل سريع' : 'Fast Delivery'}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-xs font-medium">{isRTL ? 'دفع آمن' : 'Secure Pay'}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="text-xs font-medium">{isRTL ? 'ضمان الجودة' : 'Quality'}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Checkout Bar */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 p-4 bg-background/80 backdrop-blur-3xl border-t border-white/20 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] z-50 safe-area-pb">
        <div className="flex items-center justify-between gap-4">
          <Drawer>
            <DrawerTrigger asChild>
              <div className="flex flex-col cursor-pointer">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {t('total')} <ChevronUp className="w-3 h-3" />
                </span>
                <span className="text-xl font-bold text-primary">
                  {total.toFixed(0)} <span className="text-sm font-medium">{isRTL ? 'جنيه' : 'EGP'}</span>
                </span>
              </div>
            </DrawerTrigger>
            <DrawerContent className="pb-24">
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <h3 className="font-bold text-lg mb-4">{t('order_items')}</h3>
                {cartItems.map((item: any) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                      {(item.product.imageUrl?.startsWith('http') || item.product.imageUrl?.startsWith('/')) ? (
                        <img
                          src={item.product.imageUrl}
                          alt={getProductName(item.product)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          {item.product.imageUrl || "📦"}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm line-clamp-2">{getProductName(item.product)}</div>
                      <div className="text-xs text-muted-foreground mt-1" dir="ltr">
                        {item.quantity} × {item.product.price}
                      </div>
                    </div>
                    <div className="font-bold text-sm">
                      {(item.quantity * parseFloat(item.product.price)).toFixed(0)}
                    </div>
                  </div>
                ))}
                <div className="border-t pt-4 mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('subtotal')}</span>
                    <span className="font-medium">{subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isRTL ? 'التوصيل' : 'Delivery'}</span>
                    <span className={`font-medium ${deliveryFee === 0 ? 'text-green-600' : ''}`}>
                      {deliveryFee === 0 ? (isRTL ? 'مجاناً' : 'Free') : deliveryFee.toFixed(0)}
                    </span>
                  </div>
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{isRTL ? 'خصم' : 'Discount'}</span>
                      <span className="font-medium">-{promoDiscount.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-2 border-t">
                    <span>{t('total')}</span>
                    <span className="text-primary">{total.toFixed(0)} {isRTL ? 'جنيه' : 'EGP'}</span>
                  </div>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
          <Button
            className="flex-1 h-12 text-base font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground"
            onClick={handleSubmit}
            disabled={createOrderMutation.isPending || !canPlaceOrder}
          >
            {createOrderMutation.isPending ? t('placing_order') : t('place_order')}
            {!createOrderMutation.isPending && <ArrowRight className={`w-5 h-5 ms-2 ${isRTL ? 'rotate-180' : ''}`} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
