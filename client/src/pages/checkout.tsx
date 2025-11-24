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
import i18n from "@/lib/i18n";
import { CreditCard, MapPin, Banknote } from "lucide-react";

// Define SchemaUser type if it's not already defined elsewhere
// For example:
interface SchemaUser {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  deliveryAddress: string;
  city: string;
  postalCode: string;
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // const { data: user } = useQuery<SchemaUser>({
  //   queryKey: ["/api/auth/user"],
  //   retry: false,
  //   throwOnError: false,
  // });

  const { data: cartItems = [] } = useQuery<any[]>({
    queryKey: ["/api/cart"],
  });

  // Guest user fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [notes, setNotes] = useState("");

  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    deliveryAddress: "",
    city: "",
    postalCode: "",
  });

  // Removed useEffect that populated fields from user since we are guest-friendly.
  // useEffect(() => {
  //   if (user) {
  //     setFirstName(user.firstName || "");
  //     setLastName(user.lastName || "");
  //     setEmail(user.email || "");
  //     setDeliveryAddress(user.deliveryAddress || "");
  //     setCity(user.city || "");
  //     setPostalCode(user.postalCode || "");
  //     setPhoneNumber(user.phoneNumber || "");
  //
  //     setProfileData({
  //       firstName: user.firstName || "",
  //       lastName: user.lastName || "",
  //       email: user.email || "",
  //       phoneNumber: user.phoneNumber || "",
  //       deliveryAddress: user.deliveryAddress || "",
  //       city: user.city || "",
  //       postalCode: user.postalCode || "",
  //     });
  //   }
  // }, [user]);

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
            deliveryAddress,
            city,
            postalCode,
            phoneNumber,
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
        title: "Order placed successfully!",
        description: "Your order has been received and will be processed soon.",
      });
      setLocation("/profile/orders");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const total = cartItems.reduce(
    (sum: number, item: any) => sum + parseFloat(item.product.price) * item.quantity,
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryAddress || !city || !postalCode || !phoneNumber) {
      toast({
        title: "Missing information",
        description: "Please fill in all delivery details",
        variant: "destructive",
      });
      return;
    }
    createOrderMutation.mutate();
  };

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Add some products before checking out</p>
        <Button onClick={() => setLocation("/")}>Continue Shopping</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">{t('checkout')}</h1>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Guest User Information - Only show if not authenticated */}
          (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">{t('my_account')}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('first_name')}</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('last_name')}</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          </Card>
          )

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5" />
              <h2 className="text-xl font-semibold">{t('delivery_information')}</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="address" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('street_address')}</Label>
                <Textarea
                  id="address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder={t('street_address')}
                  required
                  data-testid="input-address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('city')}</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={t('city')}
                    required
                    data-testid="input-city"
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('postal_code')}</Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder={t('postal_code')}
                    required
                    data-testid="input-postal-code"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('phone_number')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={t('phone_number')}
                  required
                  data-testid="input-phone"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5" />
              <h2 className="text-xl font-semibold">{t('payment_method')}</h2>
            </div>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="cod" id="cod" data-testid="radio-cod" />
                <Label htmlFor="cod" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-5 h-5" />
                    <div>
                      <p className="font-medium">{t('cash_on_delivery')}</p>
                      <p className="text-sm text-muted-foreground">{t('pay_when_receive')}</p>
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="visa" id="visa" data-testid="radio-visa" />
                <Label htmlFor="visa" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    <div>
                      <p className="font-medium">{t('credit_card')}</p>
                      <p className="text-sm text-muted-foreground">{t('pay_with_credit')}</p>
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="debit" id="debit" data-testid="radio-debit" />
                <Label htmlFor="debit" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    <div>
                      <p className="font-medium">{t('debit_card')}</p>
                      <p className="text-sm text-muted-foreground">{t('pay_with_debit')}</p>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </Card>

          <Card className="p-6">
            <Label htmlFor="notes" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('order_notes')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('special_instructions')}
              className="mt-2"
              data-testid="input-notes"
            />
          </Card>
        </div>

        <div>
          <Card className="p-6 sticky top-6">
            <h2 className="text-xl font-semibold mb-4">{t('order_summary')}</h2>
            <div className="space-y-3 mb-4">
              {cartItems.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.product.name} × {item.quantity}
                  </span>
                  <span>{(parseFloat(item.product.price) * item.quantity).toFixed(2)}<span className="text-xs font-normal align-top mr-1">{i18n.language === 'ar' ? 'جنيه' : 'EGP'}</span></span>
                </div>
              ))}
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold mb-4">
                <span>{t('total')}:</span>
                <span className="text-primary" data-testid="text-order-total">
                  {total.toFixed(2)}<span className="text-sm font-normal align-top mr-1">{i18n.language === 'ar' ? 'جنيه' : 'EGP'}</span>
                </span>
              </div>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={createOrderMutation.isPending}
                data-testid="button-place-order"
              >
                {createOrderMutation.isPending ? t('placing_order') : t('place_order')}
              </Button>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
