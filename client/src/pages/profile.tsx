import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { User as UserIcon, ShoppingBag, MapPin, Lock, LogOut } from "lucide-react";
import { Link } from "wouter";

// // import type { User as SchemaUser, Order } from "@shared/schema";

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();

  // const { data: user } = useQuery<SchemaUser>({
  //   queryKey: ["/api/auth/user"],
  // });

  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ["/api/orders"],
  });

  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    deliveryAddress: "",
    city: "",
    postalCode: "",
  });

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
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  // If user is not authenticated, we allow guest access without redirect.
  // The profile fields will be empty and can be filled as a guest.
  // Previously, we redirected to login here.


  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "processing":
        return "bg-blue-500";
      case "delivered":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('my_account')}</h1>
        <Button variant="outline" asChild data-testid="button-logout">
          <a href="/api/logout">
            <LogOut className="w-4 h-4 mr-2" />
            {t('log_out')}
          </a>
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Avatar className="w-20 h-20">
            <AvatarFallback className="text-2xl">
              {profileData.firstName?.[0] || profileData.email?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-user-name">
              {profileData.firstName && profileData.lastName
                ? `${profileData.firstName} ${profileData.lastName}`
                : profileData.email}
            </h2>
            <p className="text-muted-foreground" data-testid="text-user-email">
              {profileData.email}
            </p>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders" data-testid="tab-orders">
            <ShoppingBag className="w-4 h-4 mr-2" />
            {t('order_history')}
          </TabsTrigger>
          <TabsTrigger value="profile" data-testid="tab-profile">
            <UserIcon className="w-4 h-4 mr-2" />
            {t('profile_settings')}
          </TabsTrigger>
          <TabsTrigger value="location" data-testid="tab-location">
            <MapPin className="w-4 h-4 mr-2" />
            {t('delivery_address')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <h2 className="text-2xl font-bold">{t('order_history')}</h2>
          {orders.length === 0 ? (
            <Card className="p-8 text-center">
              <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">{t('no_orders')}</p>
              <Button asChild>
                <Link href="/">{t('start_shopping')}</Link>
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order: any) => (
                <Card key={order.id} className="p-6" data-testid={`order-${order.id}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">Order #{order.id}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <Badge className={getStatusColor(order.status)} data-testid={`status-${order.id}`}>
                      {order.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-muted-foreground">Payment Method</p>
                      <p className="font-medium">{order.paymentMethod.toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Amount</p>
                      <p className="font-bold text-primary text-lg">${order.totalAmount}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Delivery Address</p>
                      <p className="font-medium">
                        {order.deliveryAddress}, {order.city} {order.postalCode}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild data-testid={`button-view-order-${order.id}`}>
                    <Link href={`/orders/${order.id}`}>View Details</Link>
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">{t('profile_settings')}</h2>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('first_name')}</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) =>
                      setProfileData({ ...profileData, firstName: e.target.value })
                    }
                    data-testid="input-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('last_name')}</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) =>
                      setProfileData({ ...profileData, lastName: e.target.value })
                    }
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  data-testid="input-email"
                />
              </div>
              <div>
                <Label htmlFor="phone" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('phone_number')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profileData.phoneNumber}
                  onChange={(e) =>
                    setProfileData({ ...profileData, phoneNumber: e.target.value })
                  }
                  data-testid="input-profile-phone"
                />
              </div>
              <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                {updateProfileMutation.isPending ? t('saving') : t('save_changes')}
              </Button>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="location">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">{t('delivery_address')}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateProfileMutation.mutate({
                  deliveryAddress: profileData.deliveryAddress,
                  city: profileData.city,
                  postalCode: profileData.postalCode,
                });
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="address" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('street_address')}</Label>
                <Input
                  id="address"
                  value={profileData.deliveryAddress}
                  onChange={(e) =>
                    setProfileData({ ...profileData, deliveryAddress: e.target.value })
                  }
                  placeholder={t('street_address')}
                  data-testid="input-profile-address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('city')}</Label>
                  <Input
                    id="city"
                    value={profileData.city}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                    placeholder={t('city')}
                    data-testid="input-profile-city"
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('postal_code')}</Label>
                  <Input
                    id="postalCode"
                    value={profileData.postalCode}
                    onChange={(e) =>
                      setProfileData({ ...profileData, postalCode: e.target.value })
                    }
                    placeholder={t('postal_code')}
                    data-testid="input-profile-postal-code"
                  />
                </div>
              </div>
              <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="button-save-location">
                {updateProfileMutation.isPending ? t('saving') : t('save_address')}
              </Button>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
