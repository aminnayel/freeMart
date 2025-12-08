import { useQuery } from "@tanstack/react-query";
import { Order } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { useRoute, useLocation } from "wouter";
import { MessageSquare, Package, Clock, CheckCircle2, XCircle, MapPin, Phone, Banknote, ArrowRight, Copy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
                <Package className="w-16 h-16 text-muted-foreground/30" />
                <h2 className="text-xl font-bold">{t('order_not_found')}</h2>
                <Button onClick={() => setLocation('/profile')}>{t('back_to_orders')}</Button>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending": return "text-amber-600 bg-amber-500/10 border-amber-200/50";
            case "processing": return "text-blue-600 bg-blue-500/10 border-blue-200/50";
            case "completed": return "text-green-600 bg-green-500/10 border-green-200/50";
            case "cancelled": return "text-red-600 bg-red-500/10 border-red-200/50";
            default: return "text-gray-600 bg-gray-500/10 border-gray-200/50";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "pending": return <Clock className="w-5 h-5" />;
            case "completed": return <CheckCircle2 className="w-5 h-5" />;
            case "cancelled": return <XCircle className="w-5 h-5" />;
            default: return <Package className="w-5 h-5" />;
        }
    };

    return (
        <div className="min-h-screen bg-muted/10 pb-20" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="bg-background border-b sticky top-0 z-30">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setLocation('/profile')}>
                            <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                        </Button>
                        <h1 className="text-lg font-bold">
                            {t('order_details')} #{order.id}
                        </h1>
                    </div>
                </div>
            </div>

            <div className="container mx-auto max-w-2xl px-4 py-6 space-y-6">
                {/* Status Card */}
                <Card className="p-6 border-none shadow-sm rounded-3xl bg-background">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-1">
                                {t('status_' + order.status) || order.status}
                            </h2>
                            <p className="text-muted-foreground">
                                {format(new Date(order.createdAt!), "PPp", { locale: isRTL ? arSA : undefined })}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Order Items */}
                <div className="space-y-4">
                    <h3 className="font-bold text-lg px-2">{t('items')}</h3>
                    <Card className="overflow-hidden border-none shadow-sm rounded-3xl bg-background">
                        <div className="divide-y divide-border/50">
                            {order.items?.map((item) => (
                                <div key={item.id} className="p-4 flex gap-4">
                                    <div className="w-16 h-16 bg-muted/30 rounded-xl flex items-center justify-center text-2xl">
                                        {/* Retrieve emoji if available or fallback */}
                                        {/* Note: In real app, we might need to fetch product details or include emoji in order items projection. 
                        For now, we use a placeholder or assume backend provides it if we updated it. 
                        The query in storage.getOrderById includes items, but items table doesn't have imageUrl.
                        We'll use a generic icon if missing.
                    */}
                                        📦
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm line-clamp-2">{item.productName}</p>
                                        <p className="text-xs text-muted-foreground mt-1" dir="ltr">
                                            {item.quantity} x {item.productPrice}
                                        </p>
                                    </div>
                                    <div className="text-sm font-bold">
                                        {item.subtotal} {isRTL ? 'ج.م' : 'EGP'}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-muted/30 p-4 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t('subtotal')}</span>
                                <span>{order.totalAmount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t('delivery_fee')}</span>
                                <span className="text-green-600">{t('free')}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>{t('total')}</span>
                                <span className="text-primary">{order.totalAmount} {isRTL ? 'ج.م' : 'EGP'}</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Order Info */}
                <div className="space-y-4">
                    <h3 className="font-bold text-lg px-2">{t('order_info')}</h3>
                    <Card className="p-6 border-none shadow-sm rounded-3xl bg-background space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-sm mb-1">{t('delivery_address')}</p>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {order.deliveryAddress}, {order.city}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-sm mb-1">{t('phone_number')}</p>
                                <p className="text-sm text-muted-foreground" dir="ltr">
                                    {order.phoneNumber}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Banknote className="w-5 h-5" />
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
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm mb-1">{t('notes')}</p>
                                    <p className="text-sm text-muted-foreground">{order.notes}</p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Action Buttons */}
                <div className="pt-4">
                    <a
                        href="tel:01063226453"
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-elevate active-elevate-2 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground min-h-9 px-4 py-2 w-full h-12 rounded-xl text-base font-bold"
                    >
                        {t('need_help')}
                    </a>
                </div>
            </div>
        </div>
    );
}
