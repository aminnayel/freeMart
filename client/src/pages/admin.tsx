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
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
    Search, Plus, Edit, Trash2, AlertTriangle, Bell, Package, Grid,
    ChevronRight, ShoppingBag, TrendingUp, Users, Settings,
    ArrowLeft, Filter, MoreVertical, RefreshCcw
} from "lucide-react";
import type { Product, Category } from "@shared/schema";
import AdminCategories from "./admin/categories";
import AdminOrders from "./admin/orders";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Admin() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    // Mobile navigation state
    const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'categories' | 'orders' | 'notifications'>('dashboard');
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

    // Dashboard View
    const renderDashboard = () => (
        <div className="p-4 space-y-4 pb-24">
            {/* Welcome Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">{isRTL ? 'مرحباً بك' : 'Welcome back'} 👋</h1>
                    <p className="text-sm text-muted-foreground">{isRTL ? 'لوحة تحكم المتجر' : 'Store Dashboard'}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => refetchProducts()}>
                    <RefreshCcw className="w-5 h-5" />
                </Button>
            </div>

            {/* Back to Store Button (Mobile Only) */}
            <div className="lg:hidden">
                <Button variant="outline" className="w-full justify-start gap-2 border-dashed" asChild>
                    <Link href="/">
                        <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                        {t('back_to_store')}
                    </Link>
                </Button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 border-none bg-gradient-to-br from-primary/10 to-primary/5 active:scale-98 transition-transform" onClick={() => setActiveTab('orders')}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                            <ShoppingBag className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                            <p className="text-xs text-muted-foreground">{isRTL ? 'طلبات جديدة' : 'New Orders'}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-none bg-gradient-to-br from-green-500/10 to-green-500/5 active:scale-98 transition-transform" onClick={() => setActiveTab('products')}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                            <Package className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.totalProducts}</p>
                            <p className="text-xs text-muted-foreground">{isRTL ? 'منتج' : 'Products'}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-none bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.lowStock}</p>
                            <p className="text-xs text-muted-foreground">{isRTL ? 'مخزون منخفض' : 'Low Stock'}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-none bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.totalRevenue.toFixed(0)}</p>
                            <p className="text-xs text-muted-foreground">{isRTL ? 'الإيرادات' : 'Revenue'}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card className="p-4 border-none">
                <h2 className="font-semibold mb-3">{isRTL ? 'إجراءات سريعة' : 'Quick Actions'}</h2>
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2 border-dashed"
                        onClick={handleAdd}
                    >
                        <Plus className="w-6 h-6 text-primary" />
                        <span className="text-xs">{isRTL ? 'منتج جديد' : 'Add Product'}</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2 border-dashed"
                        onClick={() => setActiveTab('notifications')}
                    >
                        <Bell className="w-6 h-6 text-primary" />
                        <span className="text-xs">{isRTL ? 'إرسال إشعار' : 'Send Notification'}</span>
                    </Button>
                </div>
            </Card >

            {/* Recent Orders Preview */}
            < Card className="p-4 border-none" >
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold">{isRTL ? 'آخر الطلبات' : 'Recent Orders'}</h2>
                    <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setActiveTab('orders')}>
                        {isRTL ? 'عرض الكل' : 'View All'}
                        <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                    </Button>
                </div>
                <div className="space-y-2">
                    {orders?.slice(0, 3).map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
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
                                <p className="font-bold text-sm text-primary">{order.totalAmount}</p>
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
            </Card >

            {/* Low Stock Alert */}
            {
                stats.lowStock > 0 && (
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
                )
            }

            {/* Out of Stock Alert */}
            {
                stats.outOfStock > 0 && (
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
                )
            }
        </div >
    );

    // Products View (Mobile Optimized)
    const renderProducts = () => (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold">{t('products')}</h1>
                    <Button variant="ghost" size="icon" onClick={() => setShowFilters(!showFilters)}>
                        <Filter className="w-5 h-5" />
                    </Button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                    <Input
                        placeholder={isRTL ? 'بحث...' : 'Search...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`${isRTL ? 'pr-10' : 'pl-10'} bg-muted/50 border-none h-11`}
                    />
                </div>

                {/* Stock Filters */}
                {showFilters && (
                    <div className="space-y-2">
                        {/* Stock Status Filters */}
                        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                            <Button
                                variant={stockFilter === 'all' ? "default" : "outline"}
                                size="sm"
                                className="rounded-full whitespace-nowrap"
                                onClick={() => setStockFilter('all')}
                            >
                                {isRTL ? 'الكل' : 'All'} ({products.length})
                            </Button>
                            <Button
                                variant={stockFilter === 'in_stock' ? "default" : "outline"}
                                size="sm"
                                className="rounded-full whitespace-nowrap bg-green-600 hover:bg-green-700"
                                onClick={() => setStockFilter('in_stock')}
                            >
                                {isRTL ? 'متوفر' : 'In Stock'} ({products.filter(p => (p.stock || 0) >= 10).length})
                            </Button>
                            <Button
                                variant={stockFilter === 'low_stock' ? "default" : "outline"}
                                size="sm"
                                className="rounded-full whitespace-nowrap"
                                onClick={() => setStockFilter('low_stock')}
                            >
                                {isRTL ? 'قليل' : 'Low Stock'} ({stats.lowStock})
                            </Button>
                            <Button
                                variant={stockFilter === 'out_of_stock' ? "destructive" : "outline"}
                                size="sm"
                                className="rounded-full whitespace-nowrap"
                                onClick={() => setStockFilter('out_of_stock')}
                            >
                                {isRTL ? 'نفذ' : 'Out of Stock'} ({stats.outOfStock})
                            </Button>
                        </div>
                        {/* Category Filters */}
                        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                            <Button
                                variant={selectedCategoryFilter === null ? "secondary" : "ghost"}
                                size="sm"
                                className="rounded-full whitespace-nowrap"
                                onClick={() => setSelectedCategoryFilter(null)}
                            >
                                {isRTL ? 'كل الأقسام' : 'All Categories'}
                            </Button>
                            {categories.map(cat => (
                                <Button
                                    key={cat.id}
                                    variant={selectedCategoryFilter === cat.id ? "secondary" : "ghost"}
                                    size="sm"
                                    className="rounded-full whitespace-nowrap"
                                    onClick={() => setSelectedCategoryFilter(cat.id)}
                                >
                                    {cat.name}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Products List */}
            <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-2">
                {filteredProducts.map((product) => (
                    <Card
                        key={product.id}
                        className="p-3 border-none flex items-center gap-3 active:scale-98 transition-transform"
                    >
                        {/* Product Image */}
                        <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                            {(product.imageUrl?.startsWith('http') || product.imageUrl?.startsWith('/')) ? (
                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl bg-muted/50">
                                    {product.imageUrl || <Package className="w-6 h-6 opacity-50" />}
                                </div>
                            )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{product.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="font-bold text-primary">{product.price}</span>
                                <span className="text-xs text-muted-foreground">{isRTL ? 'جنيه' : 'EGP'}</span>
                                {getStockBadge(product.stock || 0)}
                            </div>
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isRTL ? "start" : "end"}>
                                <DropdownMenuItem onClick={() => handleEdit(product)}>
                                    <Edit className="w-4 h-4 me-2" />
                                    {isRTL ? 'تعديل' : 'Edit'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(product)} className="text-destructive">
                                    <Trash2 className="w-4 h-4 me-2" />
                                    {isRTL ? 'حذف' : 'Delete'}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </Card>
                ))}

                {filteredProducts.length === 0 && (
                    <div className="text-center py-12">
                        <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">{isRTL ? 'لا توجد منتجات' : 'No products found'}</p>
                    </div>
                )}
            </div>
        </div>
    );

    // Notifications View (Mobile Optimized)
    const renderNotifications = () => (
        <div className="p-4 pb-24 space-y-4">
            <h1 className="text-xl font-bold">{isRTL ? 'إرسال إشعار' : 'Send Notification'}</h1>

            <Card className="p-4 border-none space-y-4">
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
                    {pushMutation.isPending
                        ? (isRTL ? 'جاري الإرسال...' : 'Sending...')
                        : (isRTL ? 'إرسال الإشعار' : 'Send Notification')}
                </Button>
            </Card>

            {/* Stock Notification Subscribers */}
            <Card className="p-4 border-none space-y-4">
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
    );

    // Product Notifications List Component (used in renderNotifications)
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
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* DESKTOP LAYOUT */}
            <div className="hidden lg:flex">
                {/* Desktop Sidebar */}
                <aside className={`fixed top-0 ${isRTL ? 'right-0' : 'left-0'} w-64 h-screen bg-gradient-to-b from-card via-card to-card/95 border-e shadow-2xl z-40 flex flex-col`}>
                    {/* Sidebar Header */}
                    <div className="p-6 border-b bg-gradient-to-r from-primary/10 to-primary/5">
                        <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                            {isRTL ? 'لوحة التحكم' : 'Admin Panel'}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">
                            {isRTL ? 'إدارة متجرك' : 'Manage your store'}
                        </p>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'dashboard'
                                ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25'
                                : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <TrendingUp className="w-5 h-5" />
                            <span className="font-medium">{isRTL ? 'لوحة التحكم' : 'Dashboard'}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('products')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'products'
                                ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25'
                                : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Package className="w-5 h-5" />
                            <span className="font-medium">{isRTL ? 'المنتجات' : 'Products'}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative ${activeTab === 'orders'
                                ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25'
                                : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <ShoppingBag className="w-5 h-5" />
                            <span className="font-medium">{isRTL ? 'الطلبات' : 'Orders'}</span>
                            {stats.pendingOrders > 0 && (
                                <span className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 min-w-[1.25rem] h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1`}>
                                    {stats.pendingOrders}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('categories')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'categories'
                                ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25'
                                : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Grid className="w-5 h-5" />
                            <span className="font-medium">{isRTL ? 'الأقسام' : 'Categories'}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'notifications'
                                ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25'
                                : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Bell className="w-5 h-5" />
                            <span className="font-medium">{isRTL ? 'الإشعارات' : 'Notifications'}</span>
                        </button>
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t">
                        <a
                            href="/shop"
                            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors px-4 py-3 rounded-xl hover:bg-muted/50"
                        >
                            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                            <span className="font-medium">{isRTL ? 'العودة للمتجر' : 'Back to Store'}</span>
                        </a>
                    </div>
                </aside>

                {/* Desktop Content Area */}
                <main className={`flex-1 ${isRTL ? 'mr-64' : 'ml-64'}`}>
                    {/* Desktop Header */}
                    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b shadow-sm">
                        <div className="px-8 py-5 flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold">
                                    {activeTab === 'dashboard' && (isRTL ? 'لوحة التحكم' : 'Dashboard')}
                                    {activeTab === 'products' && (isRTL ? 'المنتجات' : 'Products')}
                                    {activeTab === 'orders' && (isRTL ? 'الطلبات' : 'Orders')}
                                    {activeTab === 'categories' && (isRTL ? 'الأقسام' : 'Categories')}
                                    {activeTab === 'notifications' && (isRTL ? 'الإشعارات' : 'Notifications')}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {activeTab === 'dashboard' && (isRTL ? 'نظرة عامة على المتجر' : 'Overview of your store')}
                                    {activeTab === 'products' && (isRTL ? 'إدارة منتجاتك' : 'Manage your products')}
                                    {activeTab === 'orders' && (isRTL ? 'إدارة الطلبات' : 'Manage customer orders')}
                                    {activeTab === 'categories' && (isRTL ? 'إدارة الأقسام' : 'Manage categories')}
                                    {activeTab === 'notifications' && (isRTL ? 'إرسال إشعارات للعملاء' : 'Send notifications to customers')}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {activeTab === 'products' && (
                                    <Button onClick={handleAdd} className="h-11 px-6 shadow-lg">
                                        <Plus className="w-5 h-5 me-2" />
                                        {isRTL ? 'إضافة منتج' : 'Add Product'}
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => refetchProducts()}>
                                    <RefreshCcw className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </header>

                    {/* Desktop Content */}
                    <div className="p-8">
                        {activeTab === 'dashboard' && renderDashboard()}
                        {activeTab === 'products' && renderProducts()}
                        {activeTab === 'categories' && (
                            <div>
                                <AdminCategories />
                            </div>
                        )}
                        {activeTab === 'orders' && (
                            <div>
                                <AdminOrders />
                            </div>
                        )}
                        {activeTab === 'notifications' && renderNotifications()}
                    </div>
                </main>
            </div>

            {/* MOBILE LAYOUT */}
            <div className="lg:hidden">
                {/* Mobile Content Area */}
                <div className="pb-20">
                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'products' && renderProducts()}
                    {activeTab === 'categories' && (
                        <div className="p-4 pb-24">
                            <h1 className="text-xl font-bold mb-4">{t('categories')}</h1>
                            <AdminCategories />
                        </div>
                    )}
                    {activeTab === 'orders' && (
                        <div className="p-4 pb-24">
                            <AdminOrders />
                        </div>
                    )}
                    {activeTab === 'notifications' && renderNotifications()}
                </div>

                {/* Mobile Bottom Navigation Bar */}
                <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t z-40 safe-area-pb">
                    <div className="flex justify-around items-center h-16">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${activeTab === 'dashboard' ? 'text-primary' : 'text-muted-foreground'}`}
                        >
                            <TrendingUp className="w-5 h-5" />
                            <span className="text-xs font-medium">{isRTL ? 'الرئيسية' : 'Home'}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('products')}
                            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${activeTab === 'products' ? 'text-primary' : 'text-muted-foreground'}`}
                        >
                            <Package className="w-5 h-5" />
                            <span className="text-xs font-medium">{isRTL ? 'المنتجات' : 'Products'}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors relative ${activeTab === 'orders' ? 'text-primary' : 'text-muted-foreground'}`}
                        >
                            <ShoppingBag className="w-5 h-5" />
                            {stats.pendingOrders > 0 && (
                                <span className="absolute top-1 right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                    {stats.pendingOrders}
                                </span>
                            )}
                            <span className="text-xs font-medium">{isRTL ? 'الطلبات' : 'Orders'}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('categories')}
                            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${activeTab === 'categories' ? 'text-primary' : 'text-muted-foreground'}`}
                        >
                            <Grid className="w-5 h-5" />
                            <span className="text-xs font-medium">{isRTL ? 'الأقسام' : 'Categories'}</span>
                        </button>
                    </div>
                </nav>
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
