import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import {
    ShoppingCart,
    DollarSign,
    Package,
    TrendingUp,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    BarChart3,
    ArrowUp,
    ArrowDown,
    Loader2,
    RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface OrderStats {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
}

interface SalesAnalytics {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    salesByDay: { date: string; sales: number; orders: number }[];
}

interface TopProduct {
    productId: number;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
}

interface LowStockProduct {
    id: number;
    name: string;
    englishName: string | null;
    stock: number;
    lowStockThreshold: number;
    imageUrl: string | null;
}

export default function AdminAnalytics() {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const queryClient = useQueryClient();

    // Fetch order stats
    const { data: stats, isLoading: statsLoading } = useQuery<OrderStats>({
        queryKey: ["/api/admin/stats"],
    });

    // Fetch sales analytics
    const { data: analytics, isLoading: analyticsLoading } = useQuery<SalesAnalytics>({
        queryKey: ["/api/admin/analytics"],
    });

    // Fetch top products
    const { data: topProducts = [], isLoading: topProductsLoading } = useQuery<TopProduct[]>({
        queryKey: ["/api/admin/top-products"],
    });

    // Fetch low stock products
    const { data: lowStockProducts = [], isLoading: lowStockLoading } = useQuery<LowStockProduct[]>({
        queryKey: ["/api/admin/low-stock"],
    });

    const refreshAll = () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/top-products"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/low-stock"] });
    };

    const isLoading = statsLoading || analyticsLoading;

    const statCards = [
        {
            title: isRTL ? 'إجمالي الطلبات' : 'Total Orders',
            value: stats?.totalOrders || 0,
            icon: ShoppingCart,
            bgColor: 'from-blue-500/10 to-blue-500/5',
            iconBg: 'bg-blue-500/20',
            iconColor: 'text-blue-600',
            trend: '+12%',
            trendUp: true,
        },
        {
            title: isRTL ? 'الإيرادات' : 'Revenue',
            value: `${(stats?.totalRevenue || 0).toFixed(0)}`,
            suffix: isRTL ? 'جنيه' : 'EGP',
            icon: DollarSign,
            bgColor: 'from-green-500/10 to-green-500/5',
            iconBg: 'bg-green-500/20',
            iconColor: 'text-green-600',
            trend: '+8%',
            trendUp: true,
        },
        {
            title: isRTL ? 'معلقة' : 'Pending',
            value: stats?.pendingOrders || 0,
            icon: Clock,
            bgColor: 'from-amber-500/10 to-amber-500/5',
            iconBg: 'bg-amber-500/20',
            iconColor: 'text-amber-600',
            trend: '-5%',
            trendUp: false,
        },
        {
            title: isRTL ? 'متوسط الطلب' : 'Avg. Order',
            value: `${(stats?.averageOrderValue || 0).toFixed(0)}`,
            suffix: isRTL ? 'جنيه' : 'EGP',
            icon: TrendingUp,
            bgColor: 'from-purple-500/10 to-purple-500/5',
            iconBg: 'bg-purple-500/20',
            iconColor: 'text-purple-600',
            trend: '+3%',
            trendUp: true,
        },
    ];

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">{isRTL ? 'جاري التحميل...' : 'Loading analytics...'}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 lg:space-y-6 pb-20 lg:pb-0">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <h1 className="text-xl lg:text-2xl font-bold truncate">{isRTL ? 'لوحة التحليلات' : 'Analytics'}</h1>
                    <p className="text-muted-foreground text-xs lg:text-sm">
                        {isRTL ? 'نظرة عامة على الأداء' : 'Performance overview'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] lg:text-xs hidden sm:flex">
                        {isRTL ? 'آخر 30 يوم' : 'Last 30 days'}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={refreshAll}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Stats Grid - 2x2 on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {statCards.map((stat, index) => (
                    <Card key={index} className={cn(
                        "p-4 lg:p-5 border-0 shadow-sm",
                        `bg-gradient-to-br ${stat.bgColor}`,
                        "active:scale-[0.98] transition-transform"
                    )}>
                        <div className="flex items-center justify-between mb-2 lg:mb-3">
                            <div className={cn("p-2 lg:p-2.5 rounded-xl", stat.iconBg)}>
                                <stat.icon className={cn("w-4 h-4 lg:w-5 lg:h-5", stat.iconColor)} />
                            </div>
                            <div className={cn(
                                "flex items-center text-[10px] lg:text-xs font-medium",
                                stat.trendUp ? 'text-green-600' : 'text-red-600'
                            )}>
                                {stat.trendUp ? <ArrowUp className="w-3 h-3 me-0.5" /> : <ArrowDown className="w-3 h-3 me-0.5" />}
                                {stat.trend}
                            </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl lg:text-2xl font-bold">{stat.value}</span>
                            {stat.suffix && <span className="text-xs text-muted-foreground">{stat.suffix}</span>}
                        </div>
                        <div className="text-xs lg:text-sm text-muted-foreground mt-0.5">{stat.title}</div>
                    </Card>
                ))}
            </div>

            {/* Order Status & Top Products - Stack on mobile */}
            <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
                {/* Order Status Breakdown */}
                <Card className="p-4 lg:p-6 border-0 shadow-sm bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-3 mb-4 lg:mb-6">
                        <div className="p-2 lg:p-2.5 rounded-xl bg-primary/10">
                            <BarChart3 className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                        </div>
                        <h2 className="text-base lg:text-lg font-bold">{isRTL ? 'حالة الطلبات' : 'Order Status'}</h2>
                    </div>

                    <div className="space-y-2 lg:space-y-3">
                        <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-amber-600" />
                                <span className="font-medium text-sm">{isRTL ? 'معلقة' : 'Pending'}</span>
                            </div>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-xs">
                                {stats?.pendingOrders || 0}
                            </Badge>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
                                <span className="font-medium text-sm">{isRTL ? 'مكتملة' : 'Completed'}</span>
                            </div>
                            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 text-xs">
                                {stats?.completedOrders || 0}
                            </Badge>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                            <div className="flex items-center gap-3">
                                <XCircle className="w-4 h-4 lg:w-5 lg:h-5 text-red-600" />
                                <span className="font-medium text-sm">{isRTL ? 'ملغاة' : 'Cancelled'}</span>
                            </div>
                            <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 text-xs">
                                {stats?.cancelledOrders || 0}
                            </Badge>
                        </div>
                    </div>
                </Card>

                {/* Top Products */}
                <Card className="p-4 lg:p-6 border-0 shadow-sm bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-3 mb-4 lg:mb-6">
                        <div className="p-2 lg:p-2.5 rounded-xl bg-primary/10">
                            <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                        </div>
                        <h2 className="text-base lg:text-lg font-bold">{isRTL ? 'الأكثر مبيعاً' : 'Top Sellers'}</h2>
                    </div>

                    <div className="space-y-2">
                        {topProductsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : topProducts.length > 0 ? (
                            topProducts.slice(0, 5).map((product, index) => (
                                <div key={product.productId} className="flex items-center gap-3 p-2.5 lg:p-3 bg-muted/30 rounded-xl">
                                    <div className={cn(
                                        "w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center font-bold text-xs lg:text-sm",
                                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                            index === 1 ? 'bg-slate-200 text-slate-700' :
                                                index === 2 ? 'bg-amber-100 text-amber-700' :
                                                    'bg-muted text-muted-foreground'
                                    )}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{product.productName}</div>
                                        <div className="text-[10px] lg:text-xs text-muted-foreground">
                                            {product.totalQuantity} {isRTL ? 'مبيعات' : 'sold'}
                                        </div>
                                    </div>
                                    <div className="text-xs lg:text-sm font-bold text-primary whitespace-nowrap">
                                        {product.totalRevenue.toFixed(0)} {isRTL ? 'ج' : 'EGP'}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6 text-muted-foreground">
                                <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                <p className="text-sm">{isRTL ? 'لا توجد بيانات' : 'No data yet'}</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Low Stock Alert */}
            {lowStockProducts.length > 0 && (
                <Card className="p-4 lg:p-6 border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-25 dark:from-orange-900/10 dark:to-transparent">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 lg:p-2.5 rounded-xl bg-orange-200/50 dark:bg-orange-900/30">
                            <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-base lg:text-lg font-bold">{isRTL ? 'تنبيه المخزون' : 'Low Stock'}</h2>
                            <p className="text-xs text-muted-foreground">
                                {lowStockProducts.length} {isRTL ? 'منتجات' : 'products'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3">
                        {lowStockProducts.slice(0, 6).map((product) => (
                            <div key={product.id} className="flex items-center gap-2 lg:gap-3 p-2.5 lg:p-3 bg-white dark:bg-slate-900 rounded-xl border border-orange-200/50 dark:border-orange-800/30">
                                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg bg-muted flex items-center justify-center text-xl lg:text-2xl overflow-hidden shrink-0">
                                    {product.imageUrl?.startsWith('http') || product.imageUrl?.startsWith('/') ? (
                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        product.imageUrl || <Package className="w-5 h-5 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-xs lg:text-sm truncate">
                                        {i18n.language === 'en' && product.englishName ? product.englishName : product.name}
                                    </div>
                                    <Badge variant="destructive" className="text-[10px] lg:text-xs h-5 mt-1">
                                        {product.stock} {isRTL ? 'متبقي' : 'left'}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Sales Chart */}
            <Card className="p-4 lg:p-6 border-0 shadow-sm bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3 mb-4 lg:mb-6">
                    <div className="p-2 lg:p-2.5 rounded-xl bg-primary/10">
                        <BarChart3 className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                    </div>
                    <h2 className="text-base lg:text-lg font-bold">{isRTL ? 'المبيعات اليومية' : 'Daily Sales'}</h2>
                </div>

                {analytics?.salesByDay && analytics.salesByDay.length > 0 ? (
                    <div className="space-y-2">
                        {analytics.salesByDay.slice(-7).map((day) => {
                            const maxSales = Math.max(...analytics.salesByDay.map(d => d.sales));
                            const percentage = maxSales > 0 ? (day.sales / maxSales) * 100 : 0;

                            return (
                                <div key={day.date} className="flex items-center gap-2 lg:gap-4">
                                    <div className="w-12 lg:w-16 text-xs lg:text-sm text-muted-foreground shrink-0">
                                        {day.date.slice(5)}
                                    </div>
                                    <div className="flex-1 h-6 lg:h-8 bg-muted/30 rounded-lg overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-lg transition-all duration-500"
                                            style={{ width: `${Math.max(percentage, 5)}%` }}
                                        />
                                    </div>
                                    <div className="w-16 lg:w-20 text-xs lg:text-sm font-medium text-end shrink-0">
                                        {day.sales.toFixed(0)} {isRTL ? 'ج' : 'EGP'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">{isRTL ? 'لا توجد بيانات مبيعات' : 'No sales data yet'}</p>
                        <p className="text-xs mt-1 opacity-70">{isRTL ? 'ستظهر بعد أول طلب' : 'Will appear after first order'}</p>
                    </div>
                )}
            </Card>
        </div>
    );
}
