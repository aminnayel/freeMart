import { useQuery } from "@tanstack/react-query";
import { Order } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { useRoute, useLocation, Link } from "wouter";
import { MessageSquare, Package, Clock, CheckCircle2, XCircle, MapPin, Phone, Banknote, ArrowLeft, Copy, Truck, CreditCard, Receipt, ShoppingBag, Calendar, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

interface OrderWithItems extends Order {
    items?: {
        id: number;
        productName: string;
        productPrice: string;
        quantity: number;
        subtotal: string;
        imageUrl?: string;
    }[];
}

export default function OrderDetails() {
    const [, params] = useRoute("/orders/:id");
    const id = params?.id;
    const { t, i18n } = useTranslation();
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const isRTL = i18n.language === 'ar';

    const { data: order, isLoading, error } = useQuery<OrderWithItems>({
        queryKey: [`/api/orders/${id}`],
    });

    if (isLoading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
                <p className="text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-[70vh] lg:min-h-[80vh] flex flex-col items-center justify-center p-6 text-center page-transition">
                <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center mb-6 shadow-xl">
                    <Package className="w-12 h-12 lg:w-16 lg:h-16 text-red-400" />
                </div>
                <h2 className="text-2xl lg:text-4xl font-bold mb-3">{t('order_not_found')}</h2>
                <p className="text-muted-foreground mb-8 text-sm lg:text-lg max-w-md">{isRTL ? 'لم نتمكن من العثور على هذا الطلب' : 'We couldn\'t find this order'}</p>
                <Button asChild size="lg" className="h-12 lg:h-14 px-8 lg:px-12 rounded-full shadow-xl text-base lg:text-lg">
                    <Link href="/profile">{t('back_to_orders')}</Link>
                </Button>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
            case "processing": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
            case "completed": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
            case "cancelled": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
            default: return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "pending": return <Clock className="w-6 h-6" />;
            case "processing": return <Truck className="w-6 h-6" />;
            case "completed": return <CheckCircle2 className="w-6 h-6" />;
            case "cancelled": return <XCircle className="w-6 h-6" />;
            default: return <Package className="w-6 h-6" />;
        }
    };

    const getStatusBgColor = (status: string) => {
        switch (status) {
            case "pending": return "from-amber-500/20 to-amber-500/5";
            case "processing": return "from-blue-500/20 to-blue-500/5";
            case "completed": return "from-green-500/20 to-green-500/5";
            case "cancelled": return "from-red-500/20 to-red-500/5";
            default: return "from-gray-500/20 to-gray-500/5";
        }
    };

    const totalItems = order.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

    return (
        <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background page-transition">
            {/* Header - Fixed below main navbar */}
            <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-xl border-b shadow-sm w-full">
                <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-4 lg:py-5">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setLocation('/profile')}>
                            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                        </Button>
                        <div className="p-2.5 lg:p-3 bg-primary/10 rounded-xl">
                            <Receipt className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-xl lg:text-3xl font-bold">{t('order_details')}</h1>
                            <p className="text-sm text-muted-foreground hidden lg:block">
                                {isRTL ? `طلب رقم #${order.id}` : `Order #${order.id}`}
                            </p>
                        </div>
                        <Badge variant="secondary" className="text-sm px-3 py-1 rounded-full">
                            #{order.id}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-6 lg:py-10">
                <div className="lg:grid lg:grid-cols-12 lg:gap-10">

                    {/* Left Column - Order Details */}
                    <div className="lg:col-span-8 space-y-6 lg:space-y-8 pb-8">

                        {/* Status Card - Prominent */}
                        <Card className={`border-0 shadow-lg bg-gradient-to-br ${getStatusBgColor(order.status)} rounded-2xl lg:rounded-3xl overflow-hidden`}>
                            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 lg:p-8">
                                <div className="flex items-center gap-4 lg:gap-6">
                                    <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center ${getStatusColor(order.status)}`}>
                                        {getStatusIcon(order.status)}
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-2xl lg:text-3xl font-bold mb-1">
                                            {t('status_' + order.status) || order.status}
                                        </h2>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar className="w-4 h-4" />
                                            <span className="text-sm lg:text-base">
                                                {format(new Date(order.createdAt!), "PPp", { locale: isRTL ? arSA : undefined })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Order Items */}
                        <Card className="border-0 shadow-md lg:shadow-lg bg-white dark:bg-slate-900 rounded-2xl lg:rounded-3xl overflow-hidden">
                            <div className="p-5 lg:p-8 border-b">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <ShoppingBag className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg lg:text-xl font-bold">{t('items')}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {totalItems} {isRTL ? 'منتج' : 'items'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="divide-y divide-border/50">
                                {order.items?.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className="p-4 lg:p-6 flex gap-4 hover:bg-muted/30 transition-colors"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-muted to-muted/50 rounded-xl lg:rounded-2xl flex items-center justify-center text-3xl lg:text-4xl flex-shrink-0">
                                            📦
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm lg:text-base line-clamp-2">{item.productName}</p>
                                            <p className="text-xs lg:text-sm text-muted-foreground mt-1" dir="ltr">
                                                {item.quantity} × {item.productPrice} {isRTL ? 'جنيه' : 'EGP'}
                                            </p>
                                        </div>
                                        <div className="text-end">
                                            <p className="font-bold text-primary text-lg lg:text-xl">
                                                {parseFloat(item.subtotal).toFixed(0)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{isRTL ? 'جنيه' : 'EGP'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Order Totals */}
                            <div className="bg-muted/30 p-5 lg:p-8 space-y-4">
                                <div className="flex justify-between text-sm lg:text-base">
                                    <span className="text-muted-foreground">{t('subtotal')}</span>
                                    <span className="font-medium">{parseFloat(order.totalAmount).toFixed(0)} {isRTL ? 'جنيه' : 'EGP'}</span>
                                </div>
                                <div className="flex justify-between text-sm lg:text-base">
                                    <span className="text-muted-foreground">{t('delivery_fee')}</span>
                                    <span className="font-medium text-green-600">{t('free')}</span>
                                </div>
                                <div className="border-t-2 border-dashed pt-4 flex justify-between items-center">
                                    <span className="text-lg lg:text-xl font-bold">{t('total')}</span>
                                    <span className="text-2xl lg:text-3xl font-bold text-primary">
                                        {parseFloat(order.totalAmount).toFixed(0)} <span className="text-sm lg:text-base font-medium">{isRTL ? 'جنيه' : 'EGP'}</span>
                                    </span>
                                </div>
                            </div>
                        </Card>

                        {/* Order Info - Mobile Only */}
                        <div className="lg:hidden">
                            <Card className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl overflow-hidden p-5 space-y-5">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Package className="w-5 h-5 text-primary" />
                                    </div>
                                    <h3 className="text-lg font-bold">{t('order_info')}</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/30">
                                        <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                            <MapPin className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-sm mb-1">{t('delivery_address')}</p>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {order.deliveryAddress}, {order.city}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/30">
                                        <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                            <Phone className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-sm mb-1">{t('phone_number')}</p>
                                            <p className="text-sm text-muted-foreground" dir="ltr">
                                                {order.phoneNumber}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/30">
                                        <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                            <Banknote className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-sm mb-1">{t('payment_method')}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {order.paymentMethod === 'cod'
                                                    ? (isRTL ? 'الدفع عند الاستلام' : 'Cash on Delivery')
                                                    : (isRTL ? 'دفع إلكتروني' : 'Card Payment')}
                                            </p>
                                        </div>
                                    </div>

                                    {order.notes && (
                                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/30">
                                            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                                                <MessageSquare className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-sm mb-1">{t('notes')}</p>
                                                <p className="text-sm text-muted-foreground">{order.notes}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    </div>

                    {/* Right Sidebar - Desktop Only */}
                    <div className="hidden lg:block lg:col-span-4">
                        <div className="sticky top-28 space-y-6">
                            {/* Order Info Card */}
                            <Card className="p-8 border-0 shadow-2xl bg-white dark:bg-slate-900 rounded-3xl">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl">
                                        <Package className="w-7 h-7 text-primary" />
                                    </div>
                                    <h2 className="text-2xl font-bold">{t('order_info')}</h2>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                            <MapPin className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm mb-1">{t('delivery_address')}</p>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {order.deliveryAddress}, {order.city}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                            <Phone className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm mb-1">{t('phone_number')}</p>
                                            <p className="text-sm text-muted-foreground" dir="ltr">
                                                {order.phoneNumber}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                            <Banknote className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm mb-1">{t('payment_method')}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {order.paymentMethod === 'cod'
                                                    ? (isRTL ? 'الدفع عند الاستلام' : 'Cash on Delivery')
                                                    : (isRTL ? 'دفع إلكتروني' : 'Card Payment')}
                                            </p>
                                        </div>
                                    </div>

                                    {order.notes && (
                                        <div className="flex items-start gap-4">
                                            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                                                <MessageSquare className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm mb-1">{t('notes')}</p>
                                                <p className="text-sm text-muted-foreground">{order.notes}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 pt-6 border-t">
                                    <a
                                        href="tel:01063226453"
                                        className="inline-flex items-center justify-center gap-2 w-full h-14 rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all bg-primary text-primary-foreground"
                                    >
                                        <Phone className="w-5 h-5" />
                                        {t('need_help')}
                                    </a>
                                </div>
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
                                        <p className="text-xs font-medium">{isRTL ? 'دفع آمن' : 'Secure'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                                            <CheckCircle2 className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <p className="text-xs font-medium">{isRTL ? 'ضمان' : 'Quality'}</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Help Button - Fixed Bottom */}
            <div className="lg:hidden fixed bottom-16 left-0 right-0 p-4 bg-background/80 backdrop-blur-3xl border-t border-white/20 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] z-50 safe-area-pb">
                <a
                    href="tel:01063226453"
                    className="flex items-center justify-center gap-2 w-full h-12 rounded-xl text-base font-bold shadow-lg bg-primary text-primary-foreground"
                >
                    <Phone className="w-5 h-5" />
                    {t('need_help')}
                </a>
            </div>
        </div>
    );
}
