import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Plus, Edit, Trash2, Megaphone, ExternalLink, Grid, Search as SearchIcon, Link2 } from "lucide-react";
import type { Offer, Category } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function AdminOffers() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
    const [deletingOffer, setDeletingOffer] = useState<Offer | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        titleEn: "",
        subtitle: "",
        subtitleEn: "",
        imageUrl: "",
        backgroundColor: "linear-gradient(135deg, #2E9E4F 0%, #1a7035 100%)",
        ctaText: "تسوق الآن",
        ctaTextEn: "Shop Now",
        linkType: "category" as "category" | "product" | "search" | "url",
        linkValue: "",
        sortOrder: 0,
        isActive: true,
    });

    const { data: offers = [], isLoading } = useQuery<Offer[]>({
        queryKey: ["/api/admin/offers"],
    });

    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ["/api/categories"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/admin/offers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to create offer");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
            queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
            toast({ title: isRTL ? "نجاح" : "Success", description: isRTL ? "تم إنشاء العرض بنجاح" : "Offer created successfully" });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: () => {
            toast({ title: isRTL ? "خطأ" : "Error", description: isRTL ? "فشل إنشاء العرض" : "Failed to create offer", variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: any }) => {
            const res = await fetch(`/api/admin/offers/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update offer");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
            queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
            toast({ title: isRTL ? "نجاح" : "Success", description: isRTL ? "تم تحديث العرض بنجاح" : "Offer updated successfully" });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: () => {
            toast({ title: isRTL ? "خطأ" : "Error", description: isRTL ? "فشل تحديث العرض" : "Failed to update offer", variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/admin/offers/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to delete offer");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
            queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
            toast({ title: isRTL ? "نجاح" : "Success", description: isRTL ? "تم حذف العرض بنجاح" : "Offer deleted successfully" });
            setIsDeleteOpen(false);
            setDeletingOffer(null);
        },
        onError: () => {
            toast({ title: isRTL ? "خطأ" : "Error", description: isRTL ? "فشل حذف العرض" : "Failed to delete offer", variant: "destructive" });
        },
    });

    const resetForm = () => {
        setFormData({
            title: "",
            titleEn: "",
            subtitle: "",
            subtitleEn: "",
            imageUrl: "",
            backgroundColor: "linear-gradient(135deg, #2E9E4F 0%, #1a7035 100%)",
            ctaText: "تسوق الآن",
            ctaTextEn: "Shop Now",
            linkType: "category",
            linkValue: "",
            sortOrder: 0,
            isActive: true,
        });
        setEditingOffer(null);
    };

    const handleAdd = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const handleEdit = (offer: Offer) => {
        setEditingOffer(offer);
        setFormData({
            title: offer.title,
            titleEn: offer.titleEn || "",
            subtitle: offer.subtitle || "",
            subtitleEn: offer.subtitleEn || "",
            imageUrl: offer.imageUrl || "",
            backgroundColor: offer.backgroundColor || "linear-gradient(135deg, #2E9E4F 0%, #1a7035 100%)",
            ctaText: offer.ctaText || "تسوق الآن",
            ctaTextEn: offer.ctaTextEn || "Shop Now",
            linkType: (offer.linkType as any) || "category",
            linkValue: offer.linkValue || "",
            sortOrder: offer.sortOrder || 0,
            isActive: offer.isActive ?? true,
        });
        setIsDialogOpen(true);
    };

    const handleDelete = (offer: Offer) => {
        setDeletingOffer(offer);
        setIsDeleteOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingOffer) {
            updateMutation.mutate({ id: editingOffer.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const confirmDelete = () => {
        if (deletingOffer) {
            deleteMutation.mutate(deletingOffer.id);
        }
    };

    const getLinkTypeLabel = (type: string) => {
        const labels: Record<string, { ar: string; en: string }> = {
            category: { ar: "قسم", en: "Category" },
            product: { ar: "منتج", en: "Product" },
            search: { ar: "بحث", en: "Search" },
            url: { ar: "رابط", en: "URL" },
        };
        return isRTL ? labels[type]?.ar : labels[type]?.en;
    };

    const getLinkTypeIcon = (type: string) => {
        switch (type) {
            case "category": return <Grid className="w-3 h-3" />;
            case "product": return <Megaphone className="w-3 h-3" />;
            case "search": return <SearchIcon className="w-3 h-3" />;
            case "url": return <ExternalLink className="w-3 h-3" />;
            default: return <Link2 className="w-3 h-3" />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">{isRTL ? "إدارة العروض" : "Offers Management"}</h2>
                    <p className="text-muted-foreground">{isRTL ? "إدارة عروض صفحة المتجر الرئيسية" : "Manage homepage banner offers"}</p>
                </div>
                <Button onClick={handleAdd} className="gap-2">
                    <Plus className="w-4 h-4" />
                    {isRTL ? "إضافة عرض" : "Add Offer"}
                </Button>
            </div>

            {/* Offers Grid */}
            {offers.length === 0 ? (
                <Card className="p-12 border-none bg-card/50 text-center">
                    <Megaphone className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{isRTL ? "لا توجد عروض" : "No Offers Yet"}</h3>
                    <p className="text-muted-foreground mb-6">{isRTL ? "أضف عروضك الترويجية للظهور في الصفحة الرئيسية" : "Add promotional offers to show on the homepage"}</p>
                    <Button onClick={handleAdd} className="gap-2">
                        <Plus className="w-4 h-4" />
                        {isRTL ? "إنشاء أول عرض" : "Create First Offer"}
                    </Button>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {offers.map((offer) => (
                        <Card
                            key={offer.id}
                            className={cn(
                                "overflow-hidden border-none transition-all hover:shadow-lg cursor-pointer",
                                !offer.isActive && "opacity-60"
                            )}
                            onClick={() => handleEdit(offer)}
                        >
                            {/* Preview Banner */}
                            <div
                                className="h-32 relative flex items-end p-4"
                                style={{
                                    background: offer.backgroundColor || "linear-gradient(135deg, #2E9E4F 0%, #1a7035 100%)",
                                }}
                            >
                                {offer.imageUrl && (
                                    <img
                                        src={offer.imageUrl}
                                        alt={offer.title}
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <div className="relative z-10 text-white">
                                    <h3 className="font-bold text-lg truncate">{isRTL ? offer.title : (offer.titleEn || offer.title)}</h3>
                                    {offer.subtitle && (
                                        <p className="text-sm text-white/80 truncate">{isRTL ? offer.subtitle : (offer.subtitleEn || offer.subtitle)}</p>
                                    )}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Badge variant={offer.isActive ? "default" : "secondary"} className="gap-1">
                                        {offer.isActive ? (isRTL ? "نشط" : "Active") : (isRTL ? "غير نشط" : "Inactive")}
                                    </Badge>
                                    <Badge variant="outline" className="gap-1">
                                        {getLinkTypeIcon(offer.linkType)}
                                        {getLinkTypeLabel(offer.linkType)}
                                    </Badge>
                                </div>

                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>{isRTL ? "الترتيب" : "Order"}: {offer.sortOrder}</span>
                                    <span className="truncate max-w-[120px]" title={offer.linkValue}>{offer.linkValue}</span>
                                </div>

                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => handleEdit(offer)}>
                                        <Edit className="w-4 h-4" />
                                        {isRTL ? "تعديل" : "Edit"}
                                    </Button>
                                    <Button variant="outline" size="sm" className="text-destructive gap-1" onClick={() => handleDelete(offer)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:rounded-3xl border-none">
                    <DialogHeader>
                        <DialogTitle className="text-xl">
                            {editingOffer ? (isRTL ? "تعديل العرض" : "Edit Offer") : (isRTL ? "إضافة عرض جديد" : "Add New Offer")}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Title Arabic */}
                        <div className="space-y-2">
                            <Label>{isRTL ? "العنوان (عربي)" : "Title (Arabic)"} *</Label>
                            <Input
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                placeholder="🥬 عروض الخضروات الطازجة!"
                                className="bg-muted/50 border-none h-12"
                            />
                        </div>

                        {/* Title English */}
                        <div className="space-y-2">
                            <Label>{isRTL ? "العنوان (إنجليزي)" : "Title (English)"}</Label>
                            <Input
                                value={formData.titleEn}
                                onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                                placeholder="Fresh Produce Sale! 🥬"
                                className="bg-muted/50 border-none h-12"
                            />
                        </div>

                        {/* Subtitle Arabic */}
                        <div className="space-y-2">
                            <Label>{isRTL ? "النص الفرعي (عربي)" : "Subtitle (Arabic)"}</Label>
                            <Textarea
                                value={formData.subtitle}
                                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                                placeholder="خصم حتى 30% على الفواكه والخضروات"
                                className="bg-muted/50 border-none min-h-[80px]"
                            />
                        </div>

                        {/* Subtitle English */}
                        <div className="space-y-2">
                            <Label>{isRTL ? "النص الفرعي (إنجليزي)" : "Subtitle (English)"}</Label>
                            <Textarea
                                value={formData.subtitleEn}
                                onChange={(e) => setFormData({ ...formData, subtitleEn: e.target.value })}
                                placeholder="Up to 30% off on fruits and vegetables"
                                className="bg-muted/50 border-none min-h-[80px]"
                            />
                        </div>

                        {/* Image URL */}
                        <div className="space-y-2">
                            <Label>{isRTL ? "رابط الصورة (اختياري)" : "Image URL (optional)"}</Label>
                            <Input
                                value={formData.imageUrl}
                                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                placeholder="https://..."
                                className="bg-muted/50 border-none h-12"
                                dir="ltr"
                            />
                        </div>

                        {/* Background Color */}
                        <div className="space-y-2">
                            <Label>{isRTL ? "لون الخلفية" : "Background Color"}</Label>
                            <Select
                                value={formData.backgroundColor}
                                onValueChange={(value) => setFormData({ ...formData, backgroundColor: value })}
                            >
                                <SelectTrigger className="bg-muted/50 border-none h-12">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="linear-gradient(135deg, #2E9E4F 0%, #1a7035 100%)">🟢 {isRTL ? "أخضر" : "Green"}</SelectItem>
                                    <SelectItem value="linear-gradient(135deg, #F5A623 0%, #e8940f 100%)">🟠 {isRTL ? "برتقالي" : "Orange"}</SelectItem>
                                    <SelectItem value="linear-gradient(135deg, #667eea 0%, #764ba2 100%)">🟣 {isRTL ? "بنفسجي" : "Purple"}</SelectItem>
                                    <SelectItem value="linear-gradient(135deg, #E53935 0%, #C62828 100%)">🔴 {isRTL ? "أحمر" : "Red"}</SelectItem>
                                    <SelectItem value="linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)">🔵 {isRTL ? "أزرق" : "Blue"}</SelectItem>
                                    <SelectItem value="linear-gradient(135deg, #424242 0%, #212121 100%)">⚫ {isRTL ? "أسود" : "Black"}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Link Type */}
                        <div className="space-y-2">
                            <Label>{isRTL ? "نوع الرابط" : "Link Type"} *</Label>
                            <Select
                                value={formData.linkType}
                                onValueChange={(value: any) => setFormData({ ...formData, linkType: value, linkValue: "" })}
                            >
                                <SelectTrigger className="bg-muted/50 border-none h-12">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="category">{isRTL ? "قسم (فئة)" : "Category"}</SelectItem>
                                    <SelectItem value="product">{isRTL ? "منتج محدد" : "Product"}</SelectItem>
                                    <SelectItem value="search">{isRTL ? "نتائج بحث" : "Search Query"}</SelectItem>
                                    <SelectItem value="url">{isRTL ? "رابط مخصص" : "Custom URL"}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Link Value */}
                        <div className="space-y-2">
                            <Label>
                                {formData.linkType === "category" && (isRTL ? "اختر القسم" : "Select Category")}
                                {formData.linkType === "product" && (isRTL ? "رقم المنتج" : "Product ID")}
                                {formData.linkType === "search" && (isRTL ? "كلمة البحث" : "Search Query")}
                                {formData.linkType === "url" && (isRTL ? "الرابط" : "URL Path")}
                                {" *"}
                            </Label>
                            {formData.linkType === "category" ? (
                                <Select
                                    value={formData.linkValue}
                                    onValueChange={(value) => setFormData({ ...formData, linkValue: value })}
                                >
                                    <SelectTrigger className="bg-muted/50 border-none h-12">
                                        <SelectValue placeholder={isRTL ? "اختر قسم..." : "Select category..."} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.slug}>
                                                {cat.imageUrl} {isRTL ? cat.name : (cat.englishName || cat.name)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    value={formData.linkValue}
                                    onChange={(e) => setFormData({ ...formData, linkValue: e.target.value })}
                                    required
                                    placeholder={
                                        formData.linkType === "product" ? "123" :
                                            formData.linkType === "search" ? (isRTL ? "فواكه" : "fruits") :
                                                "/shop"
                                    }
                                    className="bg-muted/50 border-none h-12"
                                    dir="ltr"
                                />
                            )}
                        </div>

                        {/* CTA Text */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{isRTL ? "نص الزر (عربي)" : "Button Text (AR)"}</Label>
                                <Input
                                    value={formData.ctaText}
                                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                                    className="bg-muted/50 border-none h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{isRTL ? "نص الزر (إنجليزي)" : "Button Text (EN)"}</Label>
                                <Input
                                    value={formData.ctaTextEn}
                                    onChange={(e) => setFormData({ ...formData, ctaTextEn: e.target.value })}
                                    className="bg-muted/50 border-none h-12"
                                />
                            </div>
                        </div>

                        {/* Sort Order & Active */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{isRTL ? "ترتيب العرض" : "Sort Order"}</Label>
                                <Input
                                    type="number"
                                    value={formData.sortOrder}
                                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                                    className="bg-muted/50 border-none h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{isRTL ? "العرض نشط" : "Active"}</Label>
                                <div className="flex items-center h-12">
                                    <Switch
                                        checked={formData.isActive}
                                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                                    />
                                    <span className="ms-2 text-sm text-muted-foreground">
                                        {formData.isActive ? (isRTL ? "ظاهر للعملاء" : "Visible to customers") : (isRTL ? "مخفي" : "Hidden")}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 mt-6">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {isRTL ? "إلغاء" : "Cancel"}
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                {createMutation.isPending || updateMutation.isPending ? (isRTL ? "جاري الحفظ..." : "Saving...") : (isRTL ? "حفظ" : "Save")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent className="sm:rounded-3xl border-none">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{isRTL ? "هل أنت متأكد؟" : "Are you sure?"}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {isRTL ? "سيتم حذف هذا العرض نهائياً ولن يظهر للعملاء." : "This offer will be permanently deleted and hidden from customers."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
                            {isRTL ? "حذف" : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
