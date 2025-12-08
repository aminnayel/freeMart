import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Plus, Edit } from "lucide-react";
import type { Category } from "@shared/schema";

export default function AdminCategories() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        englishName: "",
        slug: "",
        imageUrl: "",
    });

    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ["/api/categories"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to create category");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
            toast({ title: isRTL ? 'تم بنجاح' : 'Success', description: isRTL ? 'تم إضافة القسم بنجاح' : 'Category created successfully' });
            setIsAddOpen(false);
            setFormData({ name: "", englishName: "", slug: "", imageUrl: "" });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <Card className="p-4 border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">{t('categories')}</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {isRTL ? 'إدارة أقسام المتجر' : 'Manage store categories'}
                        </p>
                    </div>
                    <Button onClick={() => setIsAddOpen(true)} className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                        <Plus className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                        {isRTL ? 'إضافة قسم' : 'Add Category'}
                    </Button>
                </div>
            </Card>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                    <Card key={category.id} className="p-4 border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:bg-white/90 dark:hover:bg-slate-900/90 transition-all duration-300 group">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-muted/50 overflow-hidden flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform duration-300">
                                {category.imageUrl && (
                                    (category.imageUrl.startsWith('http') || category.imageUrl.startsWith('/')) ? (
                                        <img src={category.imageUrl} alt={category.name} className="w-full h-full object-cover" />
                                    ) : (
                                        category.imageUrl
                                    )
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-lg leading-tight truncate">{category.name}</h3>
                                {category.englishName && <p className="text-xs text-muted-foreground truncate">{category.englishName}</p>}
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                        /{category.slug}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Add Category Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-md rounded-3xl border-none">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">{isRTL ? 'إضافة قسم جديد' : 'Add Category'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                                {isRTL ? 'اسم القسم (عربي)' : 'Name (Arabic)'}
                            </Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="bg-muted/50 border-none h-12 rounded-xl focus:ring-2 focus:ring-primary/20"
                                placeholder={isRTL ? 'مثال: فواكه' : 'e.g., Fruits'}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="englishName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                                {isRTL ? 'اسم القسم (إنجليزي)' : 'Name (English)'}
                            </Label>
                            <Input
                                id="englishName"
                                value={formData.englishName}
                                onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
                                className="bg-muted/50 border-none h-12 rounded-xl focus:ring-2 focus:ring-primary/20"
                                placeholder="e.g., Fruits"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="slug" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                                {isRTL ? 'المسار (slug)' : 'Slug URL'}
                            </Label>
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                required
                                className="bg-muted/50 border-none h-12 rounded-xl font-mono text-sm focus:ring-2 focus:ring-primary/20"
                                dir="ltr"
                                placeholder="fruits"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="imageUrl" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                                {isRTL ? 'الصورة / إيموجي' : 'Image / Emoji'}
                            </Label>
                            <Input
                                id="imageUrl"
                                value={formData.imageUrl}
                                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                placeholder="🍎 or https://..."
                                className="bg-muted/50 border-none h-12 rounded-xl focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" disabled={createMutation.isPending}>
                                {createMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : t('save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
