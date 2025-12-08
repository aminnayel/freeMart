import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCcw, ClipboardList, Package, ShoppingBag, FolderPlus, Trash2, Edit, Filter, X, Bell, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AdminLog {
    id: number;
    adminUserId: string;
    adminName: string;
    action: string;
    targetType: string;
    targetId: number | string;
    details: string;
    timestamp: string;
}

const ACTION_TYPES = [
    'CREATE_PRODUCT',
    'UPDATE_PRODUCT',
    'DELETE_PRODUCT',
    'UPDATE_ORDER_STATUS',
    'CREATE_CATEGORY',
    'UPDATE_CATEGORY',
    'DELETE_CATEGORY',
    'SEND_NOTIFICATION',
];

export default function AdminLogs() {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    // Filter state
    const [actionFilter, setActionFilter] = useState<string>("");
    const [dateFilter, setDateFilter] = useState<string>("");
    const [showFilters, setShowFilters] = useState(false);

    // Build query string with filters
    const queryParams = useMemo(() => {
        const params = new URLSearchParams();
        if (actionFilter) params.append('action', actionFilter);
        if (dateFilter) {
            const date = new Date(dateFilter);
            params.append('startDate', date.toISOString());
            // End of day
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            params.append('endDate', endDate.toISOString());
        }
        return params.toString();
    }, [actionFilter, dateFilter]);

    const { data: logs = [], refetch, isLoading } = useQuery<AdminLog[]>({
        queryKey: ["/api/admin/logs", queryParams],
        queryFn: async () => {
            const url = queryParams ? `/api/admin/logs?${queryParams}` : '/api/admin/logs';
            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch logs');
            return res.json();
        }
    });

    const clearFilters = () => {
        setActionFilter("");
        setDateFilter("");
    };

    const hasActiveFilters = actionFilter || dateFilter;

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'CREATE_PRODUCT':
                return <Package className="w-4 h-4 text-green-600" />;
            case 'UPDATE_PRODUCT':
                return <Edit className="w-4 h-4 text-blue-600" />;
            case 'DELETE_PRODUCT':
                return <Trash2 className="w-4 h-4 text-red-600" />;
            case 'UPDATE_ORDER_STATUS':
                return <ShoppingBag className="w-4 h-4 text-purple-600" />;
            case 'CREATE_CATEGORY':
            case 'UPDATE_CATEGORY':
            case 'DELETE_CATEGORY':
                return <FolderPlus className="w-4 h-4 text-amber-600" />;
            case 'SEND_NOTIFICATION':
                return <Bell className="w-4 h-4 text-cyan-600" />;
            default:
                return <ClipboardList className="w-4 h-4 text-gray-600" />;
        }
    };

    const getActionLabel = (action: string) => {
        const labels: Record<string, { ar: string; en: string }> = {
            'CREATE_PRODUCT': { ar: 'إضافة منتج', en: 'Create Product' },
            'UPDATE_PRODUCT': { ar: 'تعديل منتج', en: 'Update Product' },
            'DELETE_PRODUCT': { ar: 'حذف منتج', en: 'Delete Product' },
            'UPDATE_ORDER_STATUS': { ar: 'تحديث حالة الطلب', en: 'Update Order Status' },
            'CREATE_CATEGORY': { ar: 'إضافة قسم', en: 'Create Category' },
            'UPDATE_CATEGORY': { ar: 'تعديل قسم', en: 'Update Category' },
            'DELETE_CATEGORY': { ar: 'حذف قسم', en: 'Delete Category' },
            'SEND_NOTIFICATION': { ar: 'إرسال إشعار', en: 'Send Notification' },
        };
        return labels[action]?.[isRTL ? 'ar' : 'en'] || action;
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE_PRODUCT':
            case 'CREATE_CATEGORY':
                return 'bg-green-500/10 text-green-600';
            case 'UPDATE_PRODUCT':
            case 'UPDATE_ORDER_STATUS':
            case 'UPDATE_CATEGORY':
                return 'bg-blue-500/10 text-blue-600';
            case 'DELETE_PRODUCT':
            case 'DELETE_CATEGORY':
                return 'bg-red-500/10 text-red-600';
            case 'SEND_NOTIFICATION':
                return 'bg-cyan-500/10 text-cyan-600';
            default:
                return 'bg-gray-500/10 text-gray-600';
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString(isRTL ? 'ar-EG' : 'en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const parseDetails = (details: string) => {
        try {
            return JSON.parse(details);
        } catch {
            return {};
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="p-4 border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h2 className="text-xl font-bold">{isRTL ? 'سجل العمليات' : 'Activity Logs'}</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {isRTL ? 'جميع العمليات الإدارية وتغييرات النظام' : 'All admin activities and system changes'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={showFilters ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                            className="gap-2"
                        >
                            <Filter className="w-4 h-4" />
                            {isRTL ? 'فلترة' : 'Filter'}
                            {hasActiveFilters && (
                                <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                                    {[actionFilter, dateFilter].filter(Boolean).length}
                                </Badge>
                            )}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 items-end">
                        {/* Action Filter */}
                        <div className="flex-1 min-w-[180px]">
                            <label className="text-xs text-muted-foreground mb-1.5 block">
                                {isRTL ? 'نوع العملية' : 'Action Type'}
                            </label>
                            <Select value={actionFilter} onValueChange={setActionFilter}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder={isRTL ? 'جميع العمليات' : 'All Actions'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {ACTION_TYPES.map(action => (
                                        <SelectItem key={action} value={action}>
                                            {getActionLabel(action)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date Filter */}
                        <div className="flex-1 min-w-[180px]">
                            <label className="text-xs text-muted-foreground mb-1.5 block">
                                {isRTL ? 'التاريخ' : 'Date'}
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="h-9 pl-10"
                                />
                            </div>
                        </div>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                                <X className="w-4 h-4" />
                                {isRTL ? 'مسح' : 'Clear'}
                            </Button>
                        )}
                    </div>
                )}
            </Card>

            {/* Logs List */}
            {logs.length === 0 ? (
                <Card className="p-12 text-center border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm min-h-[300px] flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <ClipboardList className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-bold mb-1">
                        {hasActiveFilters
                            ? (isRTL ? 'لا توجد نتائج' : 'No results')
                            : (isRTL ? 'لا توجد سجلات' : 'No logs yet')
                        }
                    </h3>
                    <p className="text-muted-foreground">
                        {hasActiveFilters
                            ? (isRTL ? 'جرب تغيير الفلاتر' : 'Try adjusting your filters')
                            : (isRTL ? 'ستظهر العمليات الإدارية هنا' : 'Admin activities will appear here')
                        }
                    </p>
                    {hasActiveFilters && (
                        <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                            {isRTL ? 'مسح الفلاتر' : 'Clear Filters'}
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="space-y-3">
                    {logs.map((log) => {
                        const details = parseDetails(log.details);
                        return (
                            <Card key={log.id} className="p-4 border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:bg-white/90 dark:hover:bg-slate-900/90 transition-all">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl ${getActionColor(log.action)} mt-1 shadow-sm`}>
                                        {getActionIcon(log.action)}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={`text-xs px-2.5 py-0.5 rounded-lg border-none bg-opacity-10 dark:bg-opacity-20 ${getActionColor(log.action)}`}>
                                                    {getActionLabel(log.action)}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                                                    #{log.targetId}
                                                </span>
                                            </div>
                                            <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                                                {formatTime(log.timestamp)}
                                            </span>
                                        </div>

                                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-sm">
                                            <span className="font-semibold text-foreground/90">{log.adminName}</span>
                                            {(details.name || details.deletedProductName || details.title) && (
                                                <>
                                                    <span className="hidden sm:inline text-muted-foreground">•</span>
                                                    <span className="text-muted-foreground truncate font-medium">
                                                        {details.name || details.deletedProductName || details.title}
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        {/* Show detailed changes for product updates */}
                                        {details.changes && Array.isArray(details.changes) && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {details.changes.map((change: string, idx: number) => (
                                                    <Badge key={idx} variant="outline" className="text-[10px] px-2 py-0.5 bg-muted/50">
                                                        {change}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        {/* Show order status update */}
                                        {details.newStatus && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-muted-foreground">{isRTL ? 'الحالة الجديدة:' : 'New Status:'}</span>
                                                <Badge variant="secondary" className="text-[10px] h-5">
                                                    {details.newStatus}
                                                </Badge>
                                            </div>
                                        )}

                                        {/* Show notification details */}
                                        {log.action === 'SEND_NOTIFICATION' && details.subscriberCount !== undefined && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-muted-foreground">{isRTL ? 'المستلمون:' : 'Recipients:'}</span>
                                                <Badge variant="secondary" className="text-[10px] h-5">
                                                    {details.subscriberCount} {isRTL ? 'مشترك' : 'subscribers'}
                                                </Badge>
                                            </div>
                                        )}

                                        {/* Show product creation details */}
                                        {log.action === 'CREATE_PRODUCT' && details.category && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-muted/50">
                                                    {isRTL ? 'القسم:' : 'Category:'} {details.category}
                                                </Badge>
                                                <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-muted/50">
                                                    {isRTL ? 'السعر:' : 'Price:'} {details.price}
                                                </Badge>
                                                <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-muted/50">
                                                    {isRTL ? 'المخزون:' : 'Stock:'} {details.stock}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
