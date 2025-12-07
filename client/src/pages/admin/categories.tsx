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
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{t('categories')}</h2>
                <Button onClick={() => setIsAddOpen(true)}>
                    <Plus className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                    {isRTL ? 'إضافة قسم' : 'Add Category'}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                    <Card key={category.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {category.imageUrl && (
                                (category.imageUrl.startsWith('http') || category.imageUrl.startsWith('/')) ? (
                                    <img src={category.imageUrl} alt={category.name} className="w-12 h-12 rounded object-cover" />
                                ) : (
                                    <div className="w-12 h-12 rounded flex items-center justify-center bg-gray-100 text-2xl">
                                        {category.imageUrl}
                                    </div>
                                )
                            )}
                            <div>
                                <h3 className="font-semibold">{category.name}</h3>
                                {category.englishName && <p className="text-sm text-muted-foreground">{category.englishName}</p>}
                            </div>
                        </div>
                        {/* Edit button could go here */}
                    </Card>
                ))}
            </div>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isRTL ? 'إضافة قسم جديد' : 'Add Category'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{isRTL ? 'اسم القسم (عربي)' : 'Category Name (Arabic)'}</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="bg-muted/30 border-transparent focus:bg-background h-11 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="englishName">{isRTL ? 'اسم القسم (إنجليزي)' : 'Category Name (English)'}</Label>
                            <Input
                                id="englishName"
                                value={formData.englishName}
                                onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
                                className="bg-muted/30 border-transparent focus:bg-background h-11 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="slug">{isRTL ? 'الاختصار (slug)' : 'Slug'}</Label>
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                required
                                className="bg-muted/30 border-transparent focus:bg-background h-11 rounded-xl"
                                dir="ltr"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="imageUrl">{isRTL ? 'رابط الصورة / إيموجي' : 'Image URL / Emoji'}</Label>
                            <Input
                                id="imageUrl"
                                value={formData.imageUrl}
                                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                placeholder="🥬 or https://..."
                                className="bg-muted/30 border-transparent focus:bg-background h-11 rounded-xl"
                            />
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="submit" className="w-full h-12 rounded-xl" disabled={createMutation.isPending}>
                                {createMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : t('save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
