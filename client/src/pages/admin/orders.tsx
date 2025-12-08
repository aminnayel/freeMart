import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Order } from "@shared/schema";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { Loader2, Search, Filter, Eye, ChevronDown, Phone, MapPin, Package, Clock, CheckCircle2, XCircle, RefreshCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface OrderWithItems extends Order {
    items?: {
        id: number;
        productName: string;
        productPrice: string;
        quantity: number;
        subtotal: string;
    }[];
}

export default function AdminOrders() {
    const { t, i18n } = useTranslation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Status change confirmation state
    const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
    const [pendingStatusChange, setPendingStatusChange] = useState<{ orderId: number; status: string } | null>(null);

    const isRTL = i18n.language === 'ar';
    const dateLocale = isRTL ? arSA : enUS;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const { data: orders, isLoading, refetch } = useQuery<Order[]>({
        queryKey: [`/api/admin/orders?search=${encodeURIComponent(debouncedSearch)}&status=${statusFilter}`],
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
            const res = await fetch(`/api/admin/orders/${orderId}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error("Failed to update status");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
            refetch();
            toast({
                title: isRTL ? "تم التحديث" : "Status Updated",
                description: isRTL ? "تم تحديث حالة الطلب بنجاح وتم إرسال إشعار للعميل" : "Order status updated and customer notified",
            });
            setIsStatusConfirmOpen(false);
            setPendingStatusChange(null);
        },
        onError: () => {
            toast({
                title: t('error'),
                description: isRTL ? "فشل تحديث حالة الطلب" : "Failed to update order status",
                variant: "destructive",
            });
        },
    });

    const getStatusConfig = (status: string) => {
        switch (status) {
            case "pending":
                return {
                    color: "bg-amber-500/10 text-amber-600 border-amber-200",
                    icon: Clock,
                    label: isRTL ? "قيد الانتظار" : "Pending"
                };
            case "processing":
                return {
                    color: "bg-blue-500/10 text-blue-600 border-blue-200",
                    icon: RefreshCcw,
                    label: isRTL ? "جاري التجهيز" : "Processing"
                };
            case "completed":
                return {
                    color: "bg-green-500/10 text-green-600 border-green-200",
                    icon: CheckCircle2,
                    label: isRTL ? "مكتمل" : "Completed"
                };
            case "cancelled":
                return {
                    color: "bg-red-500/10 text-red-600 border-red-200",
                    icon: XCircle,
                    label: isRTL ? "ملغي" : "Cancelled"
                };
            default:
                return {
                    color: "bg-gray-500/10 text-gray-600 border-gray-200",
                    icon: Package,
                    label: status
                };
        }
    };

    const viewOrderDetails = (order: Order) => {
        setSelectedOrder(order as OrderWithItems);
        setIsDetailsOpen(true);
    };

    // Open confirmation dialog before status change
    const requestStatusChange = (orderId: number, newStatus: string) => {
        setPendingStatusChange({ orderId, status: newStatus });
        setIsStatusConfirmOpen(true);
    };

    // Confirm and execute the status change
    const confirmStatusChange = () => {
        if (pendingStatusChange) {
            updateStatusMutation.mutate(pendingStatusChange);
        }
    };

    // Summary stats
    const stats = {
        total: orders?.length || 0,
        pending: orders?.filter(o => o.status === "pending").length || 0,
        completed: orders?.filter(o => o.status === "completed").length || 0,
        totalRevenue: orders?.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0) || 0,
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.total}</p>
                            <p className="text-xs text-muted-foreground">{isRTL ? "إجمالي الطلبات" : "Total Orders"}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.pending}</p>
                            <p className="text-xs text-muted-foreground">{isRTL ? "قيد الانتظار" : "Pending"}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.completed}</p>
                            <p className="text-xs text-muted-foreground">{isRTL ? "مكتمل" : "Completed"}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <span className="text-primary font-bold text-sm">{isRTL ? "ج" : "£"}</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.totalRevenue.toFixed(0)}</p>
                            <p className="text-xs text-muted-foreground">{isRTL ? "إجمالي الإيرادات" : "Revenue"}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Search and Filters */}
            <Card className="p-4 border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4`} />
                        <Input
                            placeholder={t("search_orders")}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`${isRTL ? 'pr-10' : 'pl-10'} bg-muted/50 border-none`}
                        />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <select
                            className="flex-1 sm:flex-none h-10 px-4 rounded-lg border-none bg-muted/50 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">{t("all_statuses")}</option>
                            <option value="pending">{t("status_pending")}</option>
                            <option value="processing">{isRTL ? "جاري التجهيز" : "Processing"}</option>
                            <option value="completed">{t("status_completed")}</option>
                            <option value="cancelled">{t("status_cancelled")}</option>
                        </select>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => refetch()}
                            className="h-10 w-10 border-none bg-muted/50"
                        >
                            <RefreshCcw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Orders Table */}
            <Card className="border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className={`p-4 font-semibold text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>#</th>
                                <th className={`p-4 font-semibold text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{t("customer")}</th>
                                <th className={`p-4 font-semibold text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{t("total")}</th>
                                <th className={`p-4 font-semibold text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{t("status")}</th>
                                <th className={`p-4 font-semibold text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{t("date")}</th>
                                <th className={`p-4 font-semibold text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{t("actions")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-muted/20">
                            {orders?.map((order) => {
                                const statusConfig = getStatusConfig(order.status);
                                const StatusIcon = statusConfig.icon;
                                return (
                                    <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="p-4">
                                            <span className="font-bold text-primary">#{order.id}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold">{(order as any).customerName}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-3 h-3 text-muted-foreground" />
                                                    <span className="font-medium" dir="ltr">{order.phoneNumber}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3 h-3 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={order.deliveryAddress || ''}>
                                                        {order.deliveryAddress || order.city}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-bold text-lg text-primary">{order.totalAmount}</span>
                                            <span className="text-xs text-muted-foreground ms-1">{isRTL ? 'جنيه' : 'EGP'}</span>
                                        </td>
                                        <td className="p-4">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className={`h-8 gap-2 px-3 ${statusConfig.color} hover:opacity-80`}
                                                        disabled={updateStatusMutation.isPending}
                                                    >
                                                        <StatusIcon className="w-3.5 h-3.5" />
                                                        <span className="text-xs font-medium">{statusConfig.label}</span>
                                                        <ChevronDown className="w-3 h-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align={isRTL ? "start" : "end"}>
                                                    <DropdownMenuItem onClick={() => requestStatusChange(order.id, "pending")}>
                                                        <Clock className="w-4 h-4 me-2 text-amber-600" />
                                                        {isRTL ? "قيد الانتظار" : "Pending"}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => requestStatusChange(order.id, "processing")}>
                                                        <RefreshCcw className="w-4 h-4 me-2 text-blue-600" />
                                                        {isRTL ? "جاري التجهيز" : "Processing"}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => requestStatusChange(order.id, "completed")}>
                                                        <CheckCircle2 className="w-4 h-4 me-2 text-green-600" />
                                                        {isRTL ? "مكتمل" : "Completed"}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => requestStatusChange(order.id, "cancelled")}>
                                                        <XCircle className="w-4 h-4 me-2 text-red-600" />
                                                        {isRTL ? "ملغي" : "Cancelled"}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                        <td className="p-4 text-muted-foreground text-sm">
                                            {order.createdAt && format(new Date(order.createdAt), "dd MMM yyyy", { locale: dateLocale })}
                                            <br />
                                            <span className="text-xs">{order.createdAt && format(new Date(order.createdAt), "hh:mm a", { locale: dateLocale })}</span>
                                        </td>
                                        <td className="p-4">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => viewOrderDetails(order)}
                                                className="h-8 gap-2 hover:bg-primary/10 hover:text-primary"
                                            >
                                                <Eye className="w-4 h-4" />
                                                <span className="hidden sm:inline">{isRTL ? "عرض" : "View"}</span>
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {orders?.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                                        <p className="text-muted-foreground">{t("no_orders") || (isRTL ? "لا توجد طلبات" : "No orders found")}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Order Details Dialog */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-lg rounded-2xl border-none">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Package className="w-5 h-5 text-primary" />
                            {isRTL ? `طلب #${selectedOrder?.id}` : `Order #${selectedOrder?.id}`}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-4">
                            {/* Customer Info */}
                            <div className="p-4 bg-muted/30 rounded-xl space-y-2">
                                <h4 className="font-semibold text-sm text-muted-foreground mb-3">{isRTL ? "معلومات العميل" : "Customer Info"}</h4>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-primary" />
                                    <span dir="ltr">{selectedOrder.phoneNumber}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-primary mt-0.5" />
                                    <span>{selectedOrder.deliveryAddress}, {selectedOrder.city}</span>
                                </div>
                            </div>

                            {/* Order Info */}
                            <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                                <h4 className="font-semibold text-sm text-muted-foreground mb-3">{isRTL ? "تفاصيل الطلب" : "Order Details"}</h4>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{isRTL ? "طريقة الدفع" : "Payment"}</span>
                                    <span className="font-medium">{selectedOrder.paymentMethod === 'cod' ? (isRTL ? "نقداً عند الاستلام" : "Cash on Delivery") : selectedOrder.paymentMethod}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{isRTL ? "التاريخ" : "Date"}</span>
                                    <span className="font-medium">{selectedOrder.createdAt && format(new Date(selectedOrder.createdAt), "PPp", { locale: dateLocale })}</span>
                                </div>
                                {selectedOrder.notes && (
                                    <div>
                                        <span className="text-muted-foreground text-sm">{isRTL ? "ملاحظات:" : "Notes:"}</span>
                                        <p className="mt-1 text-sm bg-white/50 dark:bg-black/20 p-2 rounded">{selectedOrder.notes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Total */}
                            <div className="p-4 bg-primary/10 rounded-xl flex justify-between items-center">
                                <span className="font-semibold">{isRTL ? "الإجمالي" : "Total"}</span>
                                <span className="text-2xl font-bold text-primary">
                                    {selectedOrder.totalAmount}
                                    <span className="text-sm font-normal text-muted-foreground ms-1">{isRTL ? "جنيه" : "EGP"}</span>
                                </span>
                            </div>

                            {/* Status Update */}
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        requestStatusChange(selectedOrder.id, "completed");
                                        setIsDetailsOpen(false);
                                    }}
                                    disabled={selectedOrder.status === "completed"}
                                >
                                    <CheckCircle2 className="w-4 h-4 me-2" />
                                    {isRTL ? "تم الاستلام" : "Mark Completed"}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                        requestStatusChange(selectedOrder.id, "cancelled");
                                        setIsDetailsOpen(false);
                                    }}
                                    disabled={selectedOrder.status === "cancelled"}
                                >
                                    <XCircle className="w-4 h-4 me-2" />
                                    {isRTL ? "إلغاء" : "Cancel"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Status Change Confirmation Dialog */}
            <AlertDialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
                <AlertDialogContent className="rounded-2xl border-none">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {isRTL ? 'تأكيد تغيير الحالة' : 'Confirm Status Change'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {isRTL
                                ? `هل أنت متأكد من تغيير حالة الطلب #${pendingStatusChange?.orderId} إلى "${getStatusConfig(pendingStatusChange?.status || '').label}"؟ سيتم إرسال إشعار للعميل بهذا التحديث.`
                                : `Are you sure you want to change order #${pendingStatusChange?.orderId} status to "${getStatusConfig(pendingStatusChange?.status || '').label}"? The customer will be notified.`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">
                            {isRTL ? 'إلغاء' : 'Cancel'}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmStatusChange}
                            className="rounded-xl"
                            disabled={updateStatusMutation.isPending}
                        >
                            {updateStatusMutation.isPending
                                ? (isRTL ? 'جاري التحديث...' : 'Updating...')
                                : (isRTL ? 'تأكيد' : 'Confirm')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
