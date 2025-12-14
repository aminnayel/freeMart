import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    CheckCircle2,
    Package,
    MapPin,
    Clock,
    Phone,
    ShoppingBag,
    Home,
    Truck,
    CreditCard,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderItem {
    id: number;
    productName: string;
    productPrice: string;
    quantity: number;
    subtotal: string;
}

interface Order {
    id: number;
    totalAmount: string;
    subtotal: string;
    deliveryFee: string;
    discount: string;
    status: string;
    paymentMethod: string;
    deliveryAddress: string;
    city: string;
    postalCode: string;
    phoneNumber: string;
    scheduledDate: string | null;
    createdAt: string;
    items: OrderItem[];
}

export default function OrderConfirmation() {
    const { orderId } = useParams();
    const [, setLocation] = useLocation();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const [showConfetti, setShowConfetti] = useState(true);

    const { data: order, isLoading, error } = useQuery<Order>({
        queryKey: ["/api/orders", orderId],
        queryFn: async () => {
            const res = await fetch(`/api/orders/${orderId}`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to fetch order");
            return res.json();
        },
        enabled: !!orderId,
    });

    // Hide confetti after 4 seconds
    useEffect(() => {
        const timer = setTimeout(() => setShowConfetti(false), 4000);
        return () => clearTimeout(timer);
    }, []);

    const getPaymentMethodLabel = (method: string) => {
        const labels: Record<string, { ar: string; en: string }> = {
            cod: { ar: 'الدفع عند الاستلام', en: 'Cash on Delivery' },
            card: { ar: 'بطاقة ائتمان', en: 'Credit Card' },
            fawry: { ar: 'فوري', en: 'Fawry' },
            vodafone_cash: { ar: 'فودافون كاش', en: 'Vodafone Cash' },
        };
        return labels[method]?.[isRTL ? 'ar' : 'en'] || method;
    };

    if (isLoading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
                <p className="text-muted-foreground">
                    {isRTL ? 'جاري تحميل تفاصيل الطلب...' : 'Loading order details...'}
                </p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-4">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <Package className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-xl font-bold">
                    {isRTL ? 'لم يتم العثور على الطلب' : 'Order Not Found'}
                </h2>
                <p className="text-muted-foreground text-center max-w-md">
                    {isRTL
                        ? 'لا يمكن العثور على هذا الطلب. تأكد من صحة الرابط.'
                        : "We couldn't find this order. Please check the URL."}
                </p>
                <Link href="/shop">
                    <Button className="gap-2">
                        <Home className="w-4 h-4" />
                        {isRTL ? 'العودة للتسوق' : 'Back to Shop'}
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50/50 to-background dark:from-green-950/20" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Confetti Effect */}
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-confetti"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 2}s`,
                                animationDuration: `${2 + Math.random() * 2}s`,
                                background: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)],
                                width: `${8 + Math.random() * 8}px`,
                                height: `${8 + Math.random() * 8}px`,
                                borderRadius: Math.random() > 0.5 ? '50%' : '0%',
                            }}
                        />
                    ))}
                </div>
            )}

            <style>{`
                @keyframes confetti {
                    0% {
                        transform: translateY(-100vh) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
                .animate-confetti {
                    animation: confetti linear forwards;
                }
            `}</style>

            <div className="container mx-auto max-w-2xl px-4 py-8 pb-24">
                {/* Success Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-4 animate-in zoom-in duration-500">
                        <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
                        {isRTL ? 'تم تأكيد طلبك!' : 'Order Confirmed!'}
                    </h1>
                    <p className="text-muted-foreground">
                        {isRTL
                            ? 'شكراً لطلبك. سنتصل بك قريباً للتأكيد.'
                            : "Thank you for your order. We'll contact you shortly."}
                    </p>
                    <Badge variant="secondary" className="mt-3 text-lg px-4 py-1">
                        {isRTL ? 'رقم الطلب:' : 'Order #'} {order.id}
                    </Badge>
                </div>

                {/* Order Items */}
                <Card className="p-5 mb-4 border-0 shadow-sm">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                        {isRTL ? 'المنتجات' : 'Order Items'}
                    </h3>
                    <div className="space-y-3">
                        {order.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                <div className="flex-1">
                                    <p className="font-medium">{item.productName}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {item.quantity} × {item.productPrice} {isRTL ? 'جنيه' : 'EGP'}
                                    </p>
                                </div>
                                <p className="font-semibold text-primary">
                                    {item.subtotal} {isRTL ? 'جنيه' : 'EGP'}
                                </p>
                            </div>
                        ))}
                    </div>

                    <Separator className="my-4" />

                    {/* Order Totals */}
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{isRTL ? 'المجموع الفرعي' : 'Subtotal'}</span>
                            <span>{order.subtotal} {isRTL ? 'جنيه' : 'EGP'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{isRTL ? 'التوصيل' : 'Delivery'}</span>
                            <span>{order.deliveryFee} {isRTL ? 'جنيه' : 'EGP'}</span>
                        </div>
                        {parseFloat(order.discount) > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span>{isRTL ? 'الخصم' : 'Discount'}</span>
                                <span>-{order.discount} {isRTL ? 'جنيه' : 'EGP'}</span>
                            </div>
                        )}
                        <Separator className="my-2" />
                        <div className="flex justify-between text-lg font-bold">
                            <span>{isRTL ? 'الإجمالي' : 'Total'}</span>
                            <span className="text-primary">{order.totalAmount} {isRTL ? 'جنيه' : 'EGP'}</span>
                        </div>
                    </div>
                </Card>

                {/* Delivery Details */}
                <Card className="p-5 mb-4 border-0 shadow-sm">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Truck className="w-5 h-5 text-primary" />
                        {isRTL ? 'تفاصيل التوصيل' : 'Delivery Details'}
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="font-medium">{order.deliveryAddress}</p>
                                <p className="text-sm text-muted-foreground">{order.city}, {order.postalCode}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-muted-foreground" />
                            <p dir="ltr">{order.phoneNumber}</p>
                        </div>
                        {order.scheduledDate && (
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-muted-foreground" />
                                <p>{new Date(order.scheduledDate).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}</p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Payment Method */}
                <Card className="p-5 mb-6 border-0 shadow-sm">
                    <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-primary" />
                        <div>
                            <p className="text-sm text-muted-foreground">{isRTL ? 'طريقة الدفع' : 'Payment Method'}</p>
                            <p className="font-medium">{getPaymentMethodLabel(order.paymentMethod)}</p>
                        </div>
                    </div>
                </Card>

                {/* Action Buttons */}
                <div className="space-y-3">
                    <Link href="/shop">
                        <Button className="w-full h-12 text-base gap-2 shadow-lg shadow-primary/20">
                            <ShoppingBag className="w-5 h-5" />
                            {isRTL ? 'متابعة التسوق' : 'Continue Shopping'}
                        </Button>
                    </Link>
                    <Link href="/profile">
                        <Button variant="outline" className="w-full h-12 text-base gap-2">
                            <Package className="w-5 h-5" />
                            {isRTL ? 'عرض طلباتي' : 'View My Orders'}
                        </Button>
                    </Link>
                </div>

                {/* Estimated Delivery */}
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl text-center">
                    <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="font-medium text-blue-700 dark:text-blue-400">
                        {isRTL ? 'الوقت المتوقع للتوصيل' : 'Expected Delivery Time'}
                    </p>
                    <p className="text-sm text-blue-600/80 dark:text-blue-400/80">
                        {isRTL ? '30-60 دقيقة' : '30-60 minutes'}
                    </p>
                </div>
            </div>
        </div>
    );
}
