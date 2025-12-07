import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  User as UserIcon, ShoppingBag, MapPin, LogOut, Package,
  ChevronRight, LayoutDashboard, Settings, Clock, CheckCircle,
  Mail, Phone, Home, Edit3
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';

  // Active section - default to 'orders' on desktop for better UX
  const [activeSection, setActiveSection] = useState<'main' | 'orders' | 'profile' | 'address'>('main');

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

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        deliveryAddress: user.deliveryAddress || "",
        city: user.city || "",
        postalCode: user.postalCode || "",
      });
    }
  }, [user]);

  // Set default section for desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && activeSection === 'main') {
        setActiveSection('orders');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeSection]);

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
        title: t('profile_updated'),
        description: t('profile_updated_desc'),
      });
    },
    onError: () => {
      toast({
        title: t('error'),
        description: t('error_update_profile'),
        variant: "destructive",
      });
    },
  });

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handleAddressUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      deliveryAddress: profileData.deliveryAddress,
      city: profileData.city,
      postalCode: profileData.postalCode,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-5 h-5" />;
      case "completed": return <CheckCircle className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "processing": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "completed": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  if (!user) return null;

  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  // Mobile Main Profile View
  const renderMain = () => (
    <div className="space-y-6 page-transition">
      {/* User Header */}
      <div className="flex flex-col items-center text-center py-6">
        <div className="relative mb-4 group cursor-pointer" onClick={() => setActiveSection('profile')}>
          <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center shadow-lg border-4 border-background ring-2 ring-primary/10">
            <span className="text-3xl font-bold text-primary">
              {profileData.firstName?.[0] || profileData.phoneNumber?.[0] || "U"}
            </span>
          </div>
          <div className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg border-2 border-background">
            <Edit3 className="w-3 h-3" />
          </div>
        </div>
        <h2 className="text-xl font-bold">
          {profileData.firstName && profileData.lastName
            ? `${profileData.firstName} ${profileData.lastName}`
            : isRTL ? 'مرحباً بك' : 'Welcome'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 font-medium" dir="ltr">
          {profileData.phoneNumber || profileData.email}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 px-2">
        <Card
          className="p-4 border-none shadow-sm bg-card/50 backdrop-blur-sm active:scale-95 transition-all cursor-pointer"
          onClick={() => setActiveSection('orders')}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="p-2.5 bg-primary/10 rounded-full text-primary">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{orders.length}</p>
              <p className="text-xs font-semibold text-muted-foreground">{isRTL ? 'طلباتي' : 'Orders'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-none shadow-sm bg-card/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className={`p-2.5 rounded-full ${pendingOrders > 0 ? 'bg-amber-100 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${pendingOrders > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>{pendingOrders}</p>
              <p className="text-xs font-semibold text-muted-foreground">{isRTL ? 'قيد الانتظار' : 'Pending'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Settings Groups */}
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {isRTL ? 'الحساب' : 'Account'}
          </p>
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm border border-border/50">
            <button
              onClick={() => setActiveSection('orders')}
              className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors active:bg-muted group"
            >
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 group-active:scale-90 transition-transform">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="flex-1 text-start">
                <p className="font-medium text-sm">{t('order_history')}</p>
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground/50 ${isRTL ? 'rotate-180' : ''}`} />
            </button>

            <div className="h-[0.5px] bg-border/50 mx-14" />

            <button
              onClick={() => setActiveSection('profile')}
              className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors active:bg-muted group"
            >
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600 group-active:scale-90 transition-transform">
                <UserIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 text-start">
                <p className="font-medium text-sm">{t('profile_settings')}</p>
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground/50 ${isRTL ? 'rotate-180' : ''}`} />
            </button>

            <div className="h-[0.5px] bg-border/50 mx-14" />

            <button
              onClick={() => setActiveSection('address')}
              className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors active:bg-muted group"
            >
              <div className="p-2 bg-green-500/10 rounded-lg text-green-600 group-active:scale-90 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1 text-start">
                <p className="font-medium text-sm">{t('delivery_address')}</p>
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground/50 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {isRTL ? 'عام' : 'General'}
          </p>
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm border border-border/50">
            {user?.isAdmin && (
              <>
                <button
                  onClick={() => window.location.href = '/admin'}
                  className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors active:bg-muted group"
                >
                  <div className="p-2 bg-orange-500/10 rounded-lg text-orange-600 group-active:scale-90 transition-transform">
                    <LayoutDashboard className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-start">
                    <p className="font-medium text-sm">{t('admin_panel') || "Admin Panel"}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground/50 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
                <div className="h-[0.5px] bg-border/50 mx-14" />
              </>
            )}

            <button
              onClick={() => {
                fetch("/api/logout", { method: "POST" })
                  .then(() => { window.location.href = "/"; })
                  .catch(() => {
                    toast({ title: t('error'), description: t('logout_failed'), variant: "destructive" });
                  });
              }}
              className="w-full flex items-center gap-4 p-4 hover:bg-destructive/5 transition-colors active:bg-destructive/10 group"
            >
              <div className="p-2 bg-destructive/10 rounded-lg text-destructive group-active:scale-90 transition-transform">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="flex-1 text-start">
                <p className="font-medium text-sm text-destructive">{t('log_out')}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile Orders View
  const renderOrders = () => (
    <div className="space-y-4 page-transition">
      {/* Mobile Sticky Header for Sub-pages */}
      <div className="lg:hidden flex items-center gap-3 mb-4">
        <button
          onClick={() => setActiveSection('main')}
          className="p-2 -ms-2 hover:bg-muted/50 rounded-full active:bg-muted transition-colors"
        >
          <ChevronRight className={`w-6 h-6 stroke-[2.5px] ${isRTL ? '' : 'rotate-180'}`} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{t('order_history')}</h1>
        </div>
        <Badge variant="secondary" className="px-3 py-1 rounded-full">{orders.length}</Badge>
      </div>

      {orders.length === 0 ? (
        <Card className="p-8 text-center border-none shadow-none bg-transparent">
          <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-primary/50" />
          </div>
          <h3 className="font-bold text-lg mb-2">{t('no_orders')}</h3>
          <p className="text-sm text-muted-foreground mb-8 text-balance">{t('no_orders_desc')}</p>
          <Button asChild className="w-full h-12 shadow-lg rounded-xl text-base">
            <Link href="/">{t('start_shopping')}</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <div className="group active:scale-[0.98] transition-all duration-200">
                <Card className="p-4 border-none shadow-sm bg-card/80 backdrop-blur-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl mt-1 ${getStatusColor(order.status)} bg-opacity-15`}>
                      {getStatusIcon(order.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-lg text-primary">
                          {order.totalAmount} <span className="text-xs font-semibold">{isRTL ? 'ج' : 'EGP'}</span>
                        </span>
                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border-0 ${getStatusColor(order.status)}`}>
                          {t('status_' + order.status) || order.status}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm mb-1">Order #{order.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
                          month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-muted-foreground/30 self-center ${isRTL ? 'rotate-180' : ''}`} />
                  </div>
                </Card>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  // Mobile Profile Settings View
  const renderProfileSettings = () => (
    <div className="space-y-6 page-transition">
      <div className="lg:hidden flex items-center gap-3 mb-4">
        <button
          onClick={() => setActiveSection('main')}
          className="p-2 -ms-2 hover:bg-muted/50 rounded-full active:bg-muted transition-colors"
        >
          <ChevronRight className={`w-6 h-6 stroke-[2.5px] ${isRTL ? '' : 'rotate-180'}`} />
        </button>
        <h1 className="text-xl font-bold">{t('profile_settings')}</h1>
      </div>

      <Card className="p-5 sm:p-6 border-none shadow-sm bg-card/80 backdrop-blur-sm rounded-2xl">
        <form onSubmit={handleProfileUpdate} className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ms-0.5">{t('first_name')}</Label>
              <Input
                value={profileData.firstName}
                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                className="bg-muted/30 border-transparent focus:bg-background h-11 sm:h-12 rounded-xl transition-all px-3"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ms-0.5">{t('last_name')}</Label>
              <Input
                value={profileData.lastName}
                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                className="bg-muted/30 border-transparent focus:bg-background h-11 sm:h-12 rounded-xl transition-all px-3"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ms-0.5">{t('email')}</Label>
            <Input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              className="bg-muted/30 border-transparent focus:bg-background h-11 sm:h-12 rounded-xl transition-all px-3"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ms-0.5">{t('phone_number')}</Label>
            <Input
              type="tel"
              value={profileData.phoneNumber}
              onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
              className="bg-muted/30 border-transparent focus:bg-background h-11 sm:h-12 rounded-xl transition-all font-mono px-3"
              dir="ltr"
            />
          </div>

          <Button type="submit" className="w-full h-11 sm:h-12 rounded-xl shadow-lg mt-2 text-base font-semibold" disabled={updateProfileMutation.isPending}>
            {updateProfileMutation.isPending ? t('saving') : t('save_changes')}
          </Button>
        </form>
      </Card>
    </div>
  );

  // Mobile Address View
  const renderAddress = () => (
    <div className="space-y-6 page-transition">
      <div className="lg:hidden flex items-center gap-3 mb-4">
        <button
          onClick={() => setActiveSection('main')}
          className="p-2 -ms-2 hover:bg-muted/50 rounded-full active:bg-muted transition-colors"
        >
          <ChevronRight className={`w-6 h-6 stroke-[2.5px] ${isRTL ? '' : 'rotate-180'}`} />
        </button>
        <h1 className="text-xl font-bold">{t('delivery_address')}</h1>
      </div>

      <Card className="p-5 sm:p-6 border-none shadow-sm bg-card/80 backdrop-blur-sm rounded-2xl">
        <form onSubmit={handleAddressUpdate} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ms-0.5">{t('street_address')}</Label>
            <Input
              value={profileData.deliveryAddress}
              onChange={(e) => setProfileData({ ...profileData, deliveryAddress: e.target.value })}
              placeholder={t('street_address_placeholder')}
              className="bg-muted/30 border-transparent focus:bg-background h-11 sm:h-12 rounded-xl transition-all px-3"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ms-0.5">{t('city')}</Label>
              <Input
                value={profileData.city}
                onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                className="bg-muted/30 border-transparent focus:bg-background h-11 sm:h-12 rounded-xl transition-all px-3"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ms-0.5">{t('postal_code')}</Label>
              <Input
                value={profileData.postalCode}
                onChange={(e) => setProfileData({ ...profileData, postalCode: e.target.value })}
                className="bg-muted/30 border-transparent focus:bg-background h-11 sm:h-12 rounded-xl transition-all px-3"
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-11 sm:h-12 rounded-xl shadow-lg mt-2 text-base font-semibold" disabled={updateProfileMutation.isPending}>
            {updateProfileMutation.isPending ? t('saving') : t('save_address')}
          </Button>
        </form>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* DESKTOP LAYOUT */}
      <div className="hidden lg:block">
        {/* Desktop Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b shadow-sm">
          <div className="container mx-auto max-w-7xl px-8 py-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl shadow-lg">
                <UserIcon className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{isRTL ? 'حسابي' : 'My Account'}</h1>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'إدارة حسابك وطلباتك' : 'Manage your account and orders'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Content */}
        <div className="container mx-auto max-w-7xl px-8 py-10">
          <div className="grid grid-cols-12 gap-10">
            {/* Desktop Sidebar */}
            <div className="col-span-4 xl:col-span-3">
              <div className="sticky top-32 space-y-6">
                {/* User Card */}
                <Card className="p-6 border-0 shadow-xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden">
                  <div className="flex items-center gap-5 mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary/30 to-primary/10 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-3xl font-bold text-primary">
                        {profileData.firstName?.[0] || profileData.phoneNumber?.[0] || "U"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold truncate">
                        {profileData.firstName && profileData.lastName
                          ? `${profileData.firstName} ${profileData.lastName}`
                          : isRTL ? 'مرحباً بك' : 'Welcome'}
                      </h2>
                      <p className="text-sm text-muted-foreground truncate" dir="ltr">
                        {profileData.phoneNumber || profileData.email}
                      </p>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-6 p-4 bg-muted/30 rounded-2xl">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">{orders.length}</p>
                      <p className="text-xs text-muted-foreground">{isRTL ? 'طلباتي' : 'Orders'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-amber-600">{pendingOrders}</p>
                      <p className="text-xs text-muted-foreground">{isRTL ? 'قيد الانتظار' : 'Pending'}</p>
                    </div>
                  </div>

                  {/* Navigation */}
                  <nav className="space-y-2">
                    <button
                      onClick={() => setActiveSection('orders')}
                      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeSection === 'orders'
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                      <ShoppingBag className="w-6 h-6" />
                      <span className="font-semibold text-base">{t('order_history')}</span>
                      {orders.length > 0 && activeSection !== 'orders' && (
                        <Badge variant="secondary" className="ms-auto">{orders.length}</Badge>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveSection('profile')}
                      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeSection === 'profile'
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                      <Edit3 className="w-6 h-6" />
                      <span className="font-semibold text-base">{t('profile_settings')}</span>
                    </button>

                    <button
                      onClick={() => setActiveSection('address')}
                      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeSection === 'address'
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                      <MapPin className="w-6 h-6" />
                      <span className="font-semibold text-base">{t('delivery_address')}</span>
                    </button>
                  </nav>
                </Card>

                {/* Admin & Logout */}
                <div className="space-y-3">
                  {user?.isAdmin && (
                    <Button className="w-full h-14 text-base shadow-lg rounded-2xl" asChild>
                      <Link href="/admin">
                        <LayoutDashboard className="w-5 h-5 me-3" />
                        {t('admin_panel') || "Admin Panel"}
                      </Link>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="w-full h-14 text-base border-destructive/20 text-destructive hover:bg-destructive/10 rounded-2xl"
                    onClick={() => {
                      fetch("/api/logout", { method: "POST" })
                        .then(() => { window.location.href = "/"; })
                        .catch(() => {
                          toast({ title: t('error'), description: t('logout_failed'), variant: "destructive" });
                        });
                    }}
                  >
                    <LogOut className="w-5 h-5 me-3" />
                    {t('log_out')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Desktop Main Content */}
            <div className="col-span-8 xl:col-span-9">
              {/* Orders Content */}
              {activeSection === 'orders' && (
                <Card className="p-8 border-0 shadow-xl bg-white dark:bg-slate-900 rounded-3xl">
                  <div className="flex items-center gap-4 mb-8 pb-6 border-b">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                      <ShoppingBag className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{t('order_history')}</h2>
                      <p className="text-sm text-muted-foreground">{isRTL ? 'جميع طلباتك السابقة' : 'All your previous orders'}</p>
                    </div>
                    <Badge variant="secondary" className="ms-auto text-base px-4 py-2">{orders.length} {isRTL ? 'طلب' : 'orders'}</Badge>
                  </div>

                  {orders.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                        <ShoppingBag className="w-12 h-12 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3">{t('no_orders')}</h3>
                      <p className="text-muted-foreground mb-8 max-w-md mx-auto">{t('no_orders_desc')}</p>
                      <Button asChild size="lg" className="h-14 px-10 text-lg rounded-2xl shadow-lg">
                        <Link href="/">{t('start_shopping')}</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order: any) => (
                        <Link key={order.id} href={`/orders/${order.id}`}>
                          <div className="flex items-center gap-6 p-6 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer">
                            <div className={`p-4 rounded-2xl ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xl font-bold">#{order.id}</p>
                                <p className="text-2xl font-bold text-primary">
                                  {order.totalAmount} <span className="text-base font-medium">{isRTL ? 'جنيه' : 'EGP'}</span>
                                </p>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                                <Badge variant="secondary" className={`text-sm px-4 py-1 ${getStatusColor(order.status)}`}>
                                  {t('status_' + order.status) || order.status}
                                </Badge>
                              </div>
                            </div>
                            <ChevronRight className={`w-6 h-6 text-muted-foreground ${isRTL ? 'rotate-180' : ''}`} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* Profile Settings Content */}
              {activeSection === 'profile' && (
                <Card className="p-8 border-0 shadow-xl bg-white dark:bg-slate-900 rounded-3xl">
                  <div className="flex items-center gap-4 mb-8 pb-6 border-b">
                    <div className="p-3 bg-blue-500/10 rounded-2xl">
                      <Edit3 className="w-7 h-7 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{t('profile_settings')}</h2>
                      <p className="text-sm text-muted-foreground">{isRTL ? 'تعديل بياناتك الشخصية' : 'Update your personal information'}</p>
                    </div>
                  </div>

                  <form onSubmit={handleProfileUpdate} className="space-y-8 max-w-2xl">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-base font-semibold">{t('first_name')}</Label>
                        <Input
                          value={profileData.firstName}
                          onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                          className="bg-muted/50 border-0 h-14 text-base rounded-xl"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-base font-semibold">{t('last_name')}</Label>
                        <Input
                          value={profileData.lastName}
                          onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                          className="bg-muted/50 border-0 h-14 text-base rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {t('email')}
                      </Label>
                      <Input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="bg-muted/50 border-0 h-14 text-base rounded-xl"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {t('phone_number')}
                      </Label>
                      <Input
                        type="tel"
                        value={profileData.phoneNumber}
                        onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                        className="bg-muted/50 border-0 h-14 text-base rounded-xl"
                        dir="ltr"
                      />
                    </div>

                    <Button type="submit" className="h-14 px-12 text-base rounded-2xl shadow-lg" disabled={updateProfileMutation.isPending}>
                      {updateProfileMutation.isPending ? t('saving') : t('save_changes')}
                    </Button>
                  </form>
                </Card>
              )}

              {/* Address Content */}
              {activeSection === 'address' && (
                <Card className="p-8 border-0 shadow-xl bg-white dark:bg-slate-900 rounded-3xl">
                  <div className="flex items-center gap-4 mb-8 pb-6 border-b">
                    <div className="p-3 bg-green-500/10 rounded-2xl">
                      <MapPin className="w-7 h-7 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{t('delivery_address')}</h2>
                      <p className="text-sm text-muted-foreground">{isRTL ? 'عنوان التوصيل الخاص بك' : 'Your delivery address'}</p>
                    </div>
                  </div>

                  <form onSubmit={handleAddressUpdate} className="space-y-8 max-w-2xl">
                    <div className="space-y-3">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        {t('street_address')}
                      </Label>
                      <Input
                        value={profileData.deliveryAddress}
                        onChange={(e) => setProfileData({ ...profileData, deliveryAddress: e.target.value })}
                        placeholder={t('street_address_placeholder')}
                        className="bg-muted/50 border-0 h-14 text-base rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-base font-semibold">{t('city')}</Label>
                        <Input
                          value={profileData.city}
                          onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                          className="bg-muted/50 border-0 h-14 text-base rounded-xl"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-base font-semibold">{t('postal_code')}</Label>
                        <Input
                          value={profileData.postalCode}
                          onChange={(e) => setProfileData({ ...profileData, postalCode: e.target.value })}
                          className="bg-muted/50 border-0 h-14 text-base rounded-xl"
                        />
                      </div>
                    </div>

                    <Button type="submit" className="h-14 px-12 text-base rounded-2xl shadow-lg" disabled={updateProfileMutation.isPending}>
                      {updateProfileMutation.isPending ? t('saving') : t('save_address')}
                    </Button>
                  </form>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE LAYOUT */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        {/* Mobile Sticky Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b px-4 py-3 shadow-sm transition-all duration-200">
          <div className="flex items-center gap-3">
            {activeSection !== 'main' && (
              <button
                onClick={() => setActiveSection('main')}
                className="p-2 -ms-2 hover:bg-muted rounded-full active:bg-primary/10 transition-colors"
                aria-label="Back"
              >
                <ChevronRight className={`w-6 h-6 stroke-[2.5px] ${isRTL ? '' : 'rotate-180'}`} />
              </button>
            )}
            <h1 className="text-xl font-bold flex-1">
              {activeSection === 'main' && (isRTL ? 'حسابي' : 'My Account')}
              {activeSection === 'orders' && t('order_history')}
              {activeSection === 'profile' && t('profile_settings')}
              {activeSection === 'address' && t('delivery_address')}
            </h1>
            {activeSection === 'orders' && (
              <Badge variant="secondary" className="ms-auto">{orders.length}</Badge>
            )}
          </div>
        </div>

        {/* Mobile Content */}
        <div className="p-4 pb-24 safe-area-pb">
          {activeSection === 'main' && renderMain()}
          {activeSection === 'orders' && renderOrders()}
          {activeSection === 'profile' && renderProfileSettings()}
          {activeSection === 'address' && renderAddress()}
        </div>
      </div>
    </div>
  );
}
