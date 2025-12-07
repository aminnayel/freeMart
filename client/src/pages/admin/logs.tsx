import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCcw, ClipboardList, Package, ShoppingBag, FolderPlus, Trash2, Edit } from "lucide-react";
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

export default function AdminLogs() {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    const { data: logs = [], refetch } = useQuery<AdminLog[]>({
        queryKey: ["/api/admin/logs"],
    });

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
                return <FolderPlus className="w-4 h-4 text-amber-600" />;
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
                return 'bg-blue-500/10 text-blue-600';
            case 'DELETE_PRODUCT':
                return 'bg-red-500/10 text-red-600';
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
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold">{isRTL ? 'سجل العمليات' : 'Activity Logs'}</h2>
                    <p className="text-sm text-muted-foreground">
                        {isRTL ? 'جميع العمليات الإدارية' : 'All admin activities'}
                    </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => refetch()}>
                    <RefreshCcw className="w-5 h-5" />
                </Button>
            </div>

            {/* Logs List */}
            {logs.length === 0 ? (
                <Card className="p-8 text-center border-none bg-muted/30">
                    <ClipboardList className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="font-semibold mb-1">{isRTL ? 'لا توجد سجلات' : 'No logs yet'}</h3>
                    <p className="text-sm text-muted-foreground">
                        {isRTL ? 'ستظهر العمليات الإدارية هنا' : 'Admin activities will appear here'}
                    </p>
                </Card>
            ) : (
                <div className="space-y-2">
                    {logs.map((log) => {
                        const details = parseDetails(log.details);
                        return (
                            <Card key={log.id} className="p-4 border-none bg-card/80 backdrop-blur-sm">
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                                        {getActionIcon(log.action)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className={`text-xs px-2 py-0.5 ${getActionColor(log.action)}`}>
                                                {getActionLabel(log.action)}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                #{log.targetId}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium truncate">
                                            {log.adminName}
                                        </p>
                                        {details.name && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {details.name || details.deletedProductName}
                                            </p>
                                        )}
                                        {details.newStatus && (
                                            <p className="text-xs text-muted-foreground">
                                                {isRTL ? 'الحالة:' : 'Status:'} {details.newStatus}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {formatTime(log.timestamp)}
                                    </span>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
