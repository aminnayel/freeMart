import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
    Search, Plus, Edit, Trash2, AlertTriangle, Bell, Package, Grid,
    ChevronRight, ShoppingBag, TrendingUp, RefreshCcw, ClipboardList, MoreVertical,
    BarChart3, Tag, Megaphone
} from "lucide-react";
import type { Product, Category } from "@shared/schema";
import AdminCategories from "./admin/categories";
import AdminOrders from "./admin/orders";
import AdminLogs from "./admin/logs";
import AdminAnalytics from "./admin/analytics";
import AdminPromoCodes from "./admin/promo-codes";
import AdminOffers from "./admin/offers";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type TabType = 'dashboard' | 'products' | 'categories' | 'orders' | 'notifications' | 'logs' | 'analytics' | 'promo-codes' | 'offers';

export default function Admin() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddEditOpen, setIsAddEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | null>(null);
    const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
    const [showFilters, setShowFilters] = useState(false);

    // Push Notification State
    const [pushData, setPushData] = useState({ title: "", message: "", link: "" });

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        englishName: "",
        description: "",
        englishDescription: "",
        price: "",
        stock: 0,
        categoryId: 1,
        unit: "unit_piece",
        imageUrl: "",
        isAvailable: true,
    });

    const { data: products = [], refetch: refetchProducts } = useQuery<Product[]>({
        queryKey: ["/api/admin/products"],
        refetchOnMount: "always",
    });

    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ["/api/categories"],
    });

    const { data: orders = [] } = useQuery<any[]>({
        queryKey: ["/api/admin/orders?status=all"],
    });

    // Stats calculation
    const stats = {
        totalProducts: products.length,
        lowStock: products.filter(p => (p.stock || 0) < 10 && (p.stock || 0) > 0).length,
        outOfStock: products.filter(p => (p.stock || 0) === 0).length,
        pendingOrders: orders?.filter(o => o.status === 'pending').length || 0,
        totalOrders: orders?.length || 0,
        totalRevenue: orders?.reduce((sum, o) => sum + parseFloat(o.totalAmount || '0'), 0) || 0,
    };

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/admin/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to create product");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            refetchProducts();
            toast({ title: t('add_product'), description: isRTL ? "تم إضافة المنتج بنجاح" : "Product created successfully" });
            setIsAddEditOpen(false);
            resetForm();
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: any }) => {
            const res = await fetch(`/api/admin/products/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update product");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            refetchProducts();
            toast({ title: t('edit_product'), description: isRTL ? "تم تحديث المنتج بنجاح" : "Product updated successfully" });
            setIsAddEditOpen(false);
            resetForm();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/admin/products/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to delete product");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            refetchProducts();
            toast({ title: t('delete_product'), description: isRTL ? "تم حذف المنتج بنجاح" : "Product deleted successfully" });
            setIsDeleteOpen(false);
            setDeletingProduct(null);
        },
    });

    const pushMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/admin/push-notification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json().catch(() => ({ message: "Failed to send notification" }));
                throw new Error(error.message || "Failed to send notification");
            }
            return res.json();
        },
        onSuccess: (data) => {
            const subscriberCount = data.subscriberCount ?? 0;
            toast({
                title: t('notifications') || "Success",
                description: subscriberCount > 0
                    ? `تم إرسال الإشعار إلى ${subscriberCount} مشترك${subscriberCount > 1 ? 'ين' : ''}`
                    : "تم حفظ الإشعار (لا يوجد مشتركين حالياً)"
            });
            setPushData({ title: "", message: "", link: "" });
        },
        onError: (error: Error) => {
            toast({
                title: t('error'),
                description: error.message || "فشل إرسال الإشعار",
                variant: "destructive"
            });
        },
    });

    const resetForm = () => {
        setFormData({
            name: "",
            englishName: "",
            description: "",
            englishDescription: "",
            price: "",
            stock: 0,
            categoryId: 1,
            unit: "unit_piece",
            imageUrl: "",
            isAvailable: true,
        });
        setEditingProduct(null);
    };

    const handleAdd = () => {
        resetForm();
        setIsAddEditOpen(true);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            englishName: product.englishName || "",
            description: product.description || "",
            englishDescription: product.englishDescription || "",
            price: product.price,
            stock: product.stock || 0,
            categoryId: product.categoryId,
            unit: product.unit || "unit_piece",
            imageUrl: product.imageUrl || "",
            isAvailable: product.isAvailable ?? true,
        });
        setIsAddEditOpen(true);
    };

    const handleDelete = (product: Product) => {
        setDeletingProduct(product);
        setIsDeleteOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProduct) {
            updateMutation.mutate({ id: editingProduct.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const confirmDelete = () => {
        if (deletingProduct) {
            deleteMutation.mutate(deletingProduct.id);
        }
    };

    const getStockBadge = (stock: number) => {
        if (stock === 0) {
            return <Badge variant="destructive" className="text-xs">{isRTL ? 'نفذ' : 'Out'}</Badge>;
        } else if (stock < 10) {
            return <Badge variant="secondary" className="text-xs">{isRTL ? 'قليل' : 'Low'}</Badge>;
        }
        return <Badge variant="default" className="bg-green-600 text-xs">{stock}</Badge>;
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategoryFilter === null || p.categoryId === selectedCategoryFilter;
        const matchesStock = stockFilter === 'all' ||
            (stockFilter === 'in_stock' && (p.stock || 0) >= 10) ||
            (stockFilter === 'low_stock' && (p.stock || 0) > 0 && (p.stock || 0) < 10) ||
            (stockFilter === 'out_of_stock' && (p.stock || 0) === 0);
        return matchesSearch && matchesCategory && matchesStock;
    });

    // Tab configuration
    const tabs: { id: TabType; label: string; icon: React.ElementType; badge?: number }[] = [
        { id: 'dashboard', label: isRTL ? 'الرئيسية' : 'Dashboard', icon: TrendingUp },
        { id: 'analytics', label: isRTL ? 'التحليلات' : 'Analytics', icon: BarChart3 },
        { id: 'products', label: isRTL ? 'المنتجات' : 'Products', icon: Package },
        { id: 'orders', label: isRTL ? 'الطلبات' : 'Orders', icon: ShoppingBag, badge: stats.pendingOrders },
        { id: 'categories', label: isRTL ? 'الأقسام' : 'Categories', icon: Grid },
        { id: 'offers', label: isRTL ? 'العروض' : 'Offers', icon: Megaphone },
        { id: 'promo-codes', label: isRTL ? 'الخصومات' : 'Promos', icon: Tag },
        { id: 'notifications', label: isRTL ? 'الإشعارات' : 'Notifications', icon: Bell },
        { id: 'logs', label: isRTL ? 'السجل' : 'Logs', icon: ClipboardList },
    ];

    // Product Notifications List Component
    function ProductNotificationsList({ isRTL }: { isRTL: boolean }) {
        const { data: notifications = [], isLoading } = useQuery<any[]>({
            queryKey: ["/api/admin/product-notifications"],
        });

        if (isLoading) {
            return <p className="text-center text-muted-foreground py-4">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>;
        }

        if (notifications.length === 0) {
            return (
                <div className="text-center py-8 text-muted-foreground">
                    <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>{isRTL ? 'لا يوجد طلبات إشعار' : 'No notification requests'}</p>
                </div>
            );
        }

        return (
            <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.map((n: any) => (
                    <div key={n.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{n.productName}</p>
                            <p className="text-xs text-muted-foreground" dir="ltr">{n.userPhone}</p>
                        </div>
                        <div className="text-end">
                            <Badge variant={n.productStock === 0 ? "destructive" : "default"} className="text-xs">
                                {n.productStock === 0 ? (isRTL ? 'نفذ' : 'Out') : `${n.productStock} ${isRTL ? 'متوفر' : 'in stock'}`}
                            </Badge>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Tab Navigation - Sticky below header */}
            <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-xl border-b">
                <div className="container mx-auto px-4">
                    {/* Desktop Tabs */}
                    <div className="hidden md:flex items-center gap-1 py-2 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                                    activeTab === tab.id
                                        ? 'bg-primary text-primary-foreground shadow-md'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {tab.badge && tab.badge > 0 && (
                                    <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                        <div className="flex-1" />
                        <Button variant="ghost" size="icon" onClick={() => refetchProducts()}>
                            <RefreshCcw className="w-4 h-4" />
                        </Button>
                        {activeTab === 'products' && (
                            <Button onClick={handleAdd} size="sm" className="gap-2">
                                <Plus className="w-4 h-4" />
                                {isRTL ? 'إضافة منتج' : 'Add Product'}
                            </Button>
                        )}
                    </div>

                    {/* Mobile Tabs - Scrollable */}
                    <div className="md:hidden flex items-center gap-2 py-2 overflow-x-auto scrollbar-none">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap relative",
                                    activeTab === tab.id
                                        ? 'bg-primary text-primary-foreground shadow-md'
                                        : 'bg-muted/50 text-muted-foreground'
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {tab.badge && tab.badge > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] px-1 py-0.5 rounded-full min-w-[1rem] text-center">
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="container mx-auto px-4 py-6">
                {/* Dashboard */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        {/* Welcome Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold">{isRTL ? 'مرحباً بك' : 'Welcome back'} 👋</h1>
                                <p className="text-muted-foreground">{isRTL ? 'لوحة تحكم المتجر' : 'Store Dashboard'}</p>
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="p-5 bg-gradient-to-br from-primary/10 to-primary/5 border-none hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('orders')}>
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary/20 rounded-xl">
                                        <ShoppingBag className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold">{stats.pendingOrders}</p>
                                        <p className="text-sm text-muted-foreground">{isRTL ? 'طلبات جديدة' : 'New Orders'}</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-5 bg-gradient-to-br from-green-500/10 to-green-500/5 border-none hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('products')}>
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-500/20 rounded-xl">
                                        <Package className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold">{stats.totalProducts}</p>
                                        <p className="text-sm text-muted-foreground">{isRTL ? 'منتج' : 'Products'}</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-5 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-none hover:shadow-lg transition-shadow cursor-pointer" onClick={() => { setStockFilter('low_stock'); setActiveTab('products'); }}>
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-amber-500/20 rounded-xl">
                                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold">{stats.lowStock}</p>
                                        <p className="text-sm text-muted-foreground">{isRTL ? 'مخزون منخفض' : 'Low Stock'}</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-5 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-none hover:shadow-lg transition-shadow">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-500/20 rounded-xl">
                                        <TrendingUp className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold">{stats.totalRevenue.toFixed(0)}</p>
                                        <p className="text-sm text-muted-foreground">{isRTL ? 'الإيرادات' : 'Revenue'}</p>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Quick Actions */}
                        <Card className="p-5 border-none bg-card/50">
                            <h2 className="font-semibold mb-4">{isRTL ? 'إجراءات سريعة' : 'Quick Actions'}</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <Button variant="outline" className="h-auto py-4 flex-col gap-2 border-dashed" onClick={handleAdd}>
                                    <Plus className="w-6 h-6 text-primary" />
                                    <span className="text-xs">{isRTL ? 'منتج جديد' : 'Add Product'}</span>
                                </Button>
                                <Button variant="outline" className="h-auto py-4 flex-col gap-2 border-dashed" onClick={() => setActiveTab('notifications')}>
                                    <Bell className="w-6 h-6 text-primary" />
                                    <span className="text-xs">{isRTL ? 'إرسال إشعار' : 'Send Notification'}</span>
                                </Button>
                                <Button variant="outline" className="h-auto py-4 flex-col gap-2 border-dashed" onClick={() => setActiveTab('orders')}>
                                    <ShoppingBag className="w-6 h-6 text-primary" />
                                    <span className="text-xs">{isRTL ? 'عرض الطلبات' : 'View Orders'}</span>
                                </Button>
                                <Button variant="outline" className="h-auto py-4 flex-col gap-2 border-dashed" onClick={() => setActiveTab('categories')}>
                                    <Grid className="w-6 h-6 text-primary" />
                                    <span className="text-xs">{isRTL ? 'الأقسام' : 'Categories'}</span>
                                </Button>
                            </div>
                        </Card>

                        {/* Recent Orders Preview */}
                        <Card className="p-5 border-none bg-card/50">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold">{isRTL ? 'آخر الطلبات' : 'Recent Orders'}</h2>
                                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setActiveTab('orders')}>
                                    {isRTL ? 'عرض الكل' : 'View All'}
                                    <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {orders?.slice(0, 5).map((order) => (
                                    <div key={order.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                                <ShoppingBag className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">#{order.id}</p>
                                                <p className="text-xs text-muted-foreground" dir="ltr">{order.phoneNumber}</p>
                                            </div>
                                        </div>
                                        <div className="text-end">
                                            <p className="font-bold text-sm text-primary">{order.totalAmount} {isRTL ? 'جنيه' : 'EGP'}</p>
                                            <Badge variant={order.status === 'pending' ? 'secondary' : 'default'} className="text-xs">
                                                {order.status === 'pending' ? (isRTL ? 'جديد' : 'New') : (isRTL ? 'مكتمل' : 'Done')}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                                {(!orders || orders.length === 0) && (
                                    <p className="text-center text-muted-foreground text-sm py-4">{isRTL ? 'لا توجد طلبات' : 'No orders yet'}</p>
                                )}
                            </div>
                        </Card>

                        {/* Alerts */}
                        {stats.lowStock > 0 && (
                            <Card className="p-4 border-none bg-amber-50 dark:bg-amber-950/20">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{isRTL ? 'تنبيه المخزون' : 'Low Stock Alert'}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {isRTL ? `${stats.lowStock} منتجات قاربت على النفاد` : `${stats.lowStock} products running low`}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => { setStockFilter('low_stock'); setActiveTab('products'); }}>
                                        {isRTL ? 'عرض' : 'View'}
                                    </Button>
                                </div>
                            </Card>
                        )}

                        {stats.outOfStock > 0 && (
                            <Card className="p-4 border-none bg-red-50 dark:bg-red-950/20">
                                <div className="flex items-center gap-3">
                                    <Package className="w-5 h-5 text-red-600" />
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{isRTL ? 'نفذ من المخزون' : 'Out of Stock'}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {isRTL ? `${stats.outOfStock} منتجات نفذت` : `${stats.outOfStock} products out of stock`}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => { setStockFilter('out_of_stock'); setActiveTab('products'); }}>
                                        {isRTL ? 'عرض' : 'View'}
                                    </Button>
                                </div>
                            </Card>
                        )}
                    </div>
                )}

                {/* Products */}
                {activeTab === 'products' && (
                    <div className="space-y-4">
                        {/* Search and Filters */}
                        <Card className="p-4 border-none bg-card/50">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? 'right-3' : 'left-3')} />
                                    <Input
                                        placeholder={isRTL ? 'بحث عن منتج...' : 'Search products...'}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={cn("h-11 rounded-xl bg-muted/50 border-none", isRTL ? 'pr-10' : 'pl-10')}
                                    />
                                </div>
                                <div className="flex gap-2 overflow-x-auto">
                                    <Button
                                        variant={stockFilter === 'all' ? "default" : "outline"}
                                        size="sm"
                                        className="rounded-full whitespace-nowrap"
                                        onClick={() => setStockFilter('all')}
                                    >
                                        {isRTL ? 'الكل' : 'All'} ({products.length})
                                    </Button>
                                    <Button
                                        variant={stockFilter === 'low_stock' ? "default" : "outline"}
                                        size="sm"
                                        className={cn("rounded-full whitespace-nowrap", stockFilter === 'low_stock' ? 'bg-amber-500 hover:bg-amber-600' : 'text-amber-600 border-amber-200')}
                                        onClick={() => setStockFilter('low_stock')}
                                    >
                                        {isRTL ? 'قليل' : 'Low'} ({stats.lowStock})
                                    </Button>
                                    <Button
                                        variant={stockFilter === 'out_of_stock' ? "destructive" : "outline"}
                                        size="sm"
                                        className={cn("rounded-full whitespace-nowrap", stockFilter !== 'out_of_stock' && 'text-red-600 border-red-200')}
                                        onClick={() => setStockFilter('out_of_stock')}
                                    >
                                        {isRTL ? 'نفذ' : 'Out'} ({stats.outOfStock})
                                    </Button>
                                </div>
                            </div>

                            {/* Category Filter */}
                            <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-none">
                                <Button
                                    variant={selectedCategoryFilter === null ? "secondary" : "ghost"}
                                    size="sm"
                                    className="rounded-full whitespace-nowrap h-8 text-xs"
                                    onClick={() => setSelectedCategoryFilter(null)}
                                >
                                    {isRTL ? 'كل الأقسام' : 'All Categories'}
                                </Button>
                                {categories.map(cat => (
                                    <Button
                                        key={cat.id}
                                        variant={selectedCategoryFilter === cat.id ? "secondary" : "ghost"}
                                        size="sm"
                                        className="rounded-full whitespace-nowrap h-8 text-xs"
                                        onClick={() => setSelectedCategoryFilter(cat.id)}
                                    >
                                        {cat.imageUrl} {cat.name}
                                    </Button>
                                ))}
                            </div>

                            {/* Mobile Add Button */}
                            <div className="md:hidden mt-4">
                                <Button onClick={handleAdd} className="w-full gap-2">
                                    <Plus className="w-4 h-4" />
                                    {isRTL ? 'إضافة منتج جديد' : 'Add New Product'}
                                </Button>
                            </div>
                        </Card>

                        {/* Products Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredProducts.map((product) => (
                                <Card
                                    key={product.id}
                                    className="p-4 border-none flex gap-4 bg-card/50 hover:shadow-lg transition-all cursor-pointer group"
                                    onClick={() => handleEdit(product)}
                                >
                                    {/* Product Image */}
                                    <div className="w-20 h-20 rounded-xl bg-muted/50 overflow-hidden flex-shrink-0 relative group-hover:scale-105 transition-transform">
                                        {(product.imageUrl?.startsWith('http') || product.imageUrl?.startsWith('/')) ? (
                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-4xl">
                                                {product.imageUrl || <Package className="w-8 h-8 opacity-30" />}
                                            </div>
                                        )}
                                        {(product.stock || 0) === 0 && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <Package className="w-6 h-6 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-bold truncate">{product.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{product.englishName}</p>
                                            </div>
                                            {getStockBadge(product.stock || 0)}
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="font-bold text-primary">{product.price} <span className="text-xs text-muted-foreground">{isRTL ? 'جنيه' : 'EGP'}</span></p>
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align={isRTL ? "start" : "end"}>
                                                        <DropdownMenuItem onClick={() => handleEdit(product)} className="gap-2">
                                                            <Edit className="w-4 h-4" />
                                                            {isRTL ? 'تعديل' : 'Edit'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDelete(product)} className="gap-2 text-destructive">
                                                            <Trash2 className="w-4 h-4" />
                                                            {isRTL ? 'حذف' : 'Delete'}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {filteredProducts.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                                    <Package className="w-10 h-10 text-muted-foreground/30" />
                                </div>
                                <h3 className="font-bold text-lg">{isRTL ? 'لا توجد منتجات' : 'No products found'}</h3>
                                <p className="text-sm text-muted-foreground max-w-xs mt-1">
                                    {searchTerm ? (isRTL ? 'جرب البحث بكلمات مختلفة' : 'Try searching with different keywords') : (isRTL ? 'إبدأ بإضافة منتجات جديدة' : 'Start by adding new products')}
                                </p>
                                {!searchTerm && (
                                    <Button onClick={handleAdd} className="mt-6">
                                        <Plus className="w-4 h-4 me-2" />
                                        {isRTL ? 'إضافة منتج' : 'Add Product'}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Orders */}
                {activeTab === 'orders' && <AdminOrders />}

                {/* Categories */}
                {activeTab === 'categories' && <AdminCategories />}

                {/* Notifications */}
                {activeTab === 'notifications' && (
                    <div className="space-y-6 max-w-2xl">
                        <Card className="p-6 border-none bg-card/50 space-y-4">
                            <h2 className="text-lg font-bold">{isRTL ? 'إرسال إشعار' : 'Send Notification'}</h2>

                            <div className="space-y-2">
                                <Label>{isRTL ? 'العنوان' : 'Title'}</Label>
                                <Input
                                    value={pushData.title}
                                    onChange={(e) => setPushData({ ...pushData, title: e.target.value })}
                                    placeholder={isRTL ? 'مثال: عروض جديدة 🎉' : 'e.g., New Offers! 🎉'}
                                    className="bg-muted/50 border-none h-12"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{isRTL ? 'الرسالة' : 'Message'}</Label>
                                <Textarea
                                    value={pushData.message}
                                    onChange={(e) => setPushData({ ...pushData, message: e.target.value })}
                                    placeholder={isRTL ? 'أكتب رسالتك هنا...' : 'Write your message here...'}
                                    className="bg-muted/50 border-none min-h-[120px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{isRTL ? 'الرابط (اختياري)' : 'Link (Optional)'}</Label>
                                <Input
                                    value={pushData.link}
                                    onChange={(e) => setPushData({ ...pushData, link: e.target.value })}
                                    placeholder="/shop"
                                    className="bg-muted/50 border-none h-12"
                                    dir="ltr"
                                />
                            </div>

                            <Button
                                onClick={() => pushMutation.mutate(pushData)}
                                disabled={pushMutation.isPending || !pushData.title || !pushData.message}
                                className="w-full h-12 text-base"
                            >
                                {pushMutation.isPending ? (isRTL ? 'جاري الإرسال...' : 'Sending...') : (isRTL ? 'إرسال الإشعار' : 'Send Notification')}
                            </Button>
                        </Card>

                        <Card className="p-6 border-none bg-card/50 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-bold">{isRTL ? 'المنتظرين للمنتجات' : 'Waiting for Stock'}</h2>
                                <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/product-notifications"] })}>
                                    <RefreshCcw className="w-4 h-4" />
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {isRTL ? 'العملاء الذين طلبوا إشعارهم عند توفر منتجات نفذت' : 'Customers waiting for out-of-stock products'}
                            </p>
                            <ProductNotificationsList isRTL={isRTL} />
                        </Card>
                    </div>
                )}

                {/* Logs */}
                {activeTab === 'logs' && <AdminLogs />}

                {/* Analytics */}
                {activeTab === 'analytics' && <AdminAnalytics />}

                {/* Promo Codes */}
                {activeTab === 'promo-codes' && <AdminPromoCodes />}

                {/* Offers */}
                {activeTab === 'offers' && <AdminOffers />}
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:rounded-3xl border-none">
                    <DialogHeader>
                        <DialogTitle className="text-xl">{editingProduct ? t('edit_product') : t('add_product')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label>{isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="bg-muted/50 border-none h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{isRTL ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                                <Input
                                    value={formData.englishName}
                                    onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
                                    className="bg-muted/50 border-none h-12"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('product_price')}</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    required
                                    className="bg-muted/50 border-none h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('product_stock')}</Label>
                                <Input
                                    type="number"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                                    required
                                    className="bg-muted/50 border-none h-12"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('product_category')}</Label>
                                <select
                                    className="flex h-12 w-full rounded-md border-none bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: parseInt(e.target.value) })}
                                >
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('unit')}</Label>
                                <select
                                    className="flex h-12 w-full rounded-md border-none bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                >
                                    <option value="unit_piece">{t('unit_piece')}</option>
                                    <option value="unit_kg">{t('unit_kg')}</option>
                                    <option value="unit_g">{t('unit_g')}</option>
                                    <option value="unit_box">{t('unit_box')}</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{isRTL ? 'رابط الصورة / إيموجي' : 'Image URL / Emoji'}</Label>
                            <Input
                                value={formData.imageUrl}
                                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                className="bg-muted/50 border-none h-12"
                                placeholder="🍎 or https://..."
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isAvailable"
                                checked={formData.isAvailable}
                                onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="isAvailable">{t('product_available')}</Label>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="submit" className="w-full h-12 text-base">
                                {editingProduct ? t('save_changes') : t('add_product')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent className="rounded-2xl border-none">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('delete_confirmation_message')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="rounded-xl bg-destructive text-destructive-foreground">
                            {t('delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
