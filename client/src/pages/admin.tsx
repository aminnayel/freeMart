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
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Search, Plus, Edit, Trash2, AlertTriangle } from "lucide-react";
import type { Product, Category } from "@shared/schema";


export default function Admin() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { t, i18n } = useTranslation();

    const [searchTerm, setSearchTerm] = useState("");
    const [isAddEditOpen, setIsAddEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        description: "",
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
            toast({ title: t('add_product'), description: "Product created successfully" });
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
            toast({ title: t('edit_product'), description: "Product updated successfully" });
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
            toast({ title: t('delete_product'), description: "Product deleted successfully" });
            setIsDeleteOpen(false);
            setDeletingProduct(null);
        },
    });

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
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
            description: product.description || "",
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
            return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />{t('stock_out')}</Badge>;
        } else if (stock < 10) {
            return <Badge variant="secondary" className="gap-1"><AlertTriangle className="w-3 h-3" />{t('stock_low')}</Badge>;
        }
        return <Badge variant="default">{t('stock_ok')}</Badge>;
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">{t('admin_portal')}</h1>
                <p className="text-muted-foreground">{t('admin_products')}</p>
            </div>

            <Card className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder={t('search_products')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Button onClick={handleAdd} className="gap-2">
                        <Plus className="w-4 h-4" />
                        {t('add_product')}
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left p-3">{t('product_name')}</th>
                                <th className="text-left p-3">{t('product_price')}</th>
                                <th className="text-left p-3">{t('product_stock')}</th>
                                <th className="text-left p-3">{t('product_category')}</th>
                                <th className="text-right p-3">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="border-b hover:bg-muted/50">
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            {product.imageUrl && (
                                                <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded object-cover" />
                                            )}
                                            <span className="font-medium">{product.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        {product.price} <span className="text-xs">{i18n.language === 'ar' ? 'جنيه' : 'EGP'}</span>
                                    </td>
                                    <td className="p-3">{getStockBadge(product.stock || 0)}</td>
                                    <td className="p-3">
                                        {categories.find(c => c.id === product.categoryId)?.name}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDelete(product)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingProduct ? t('edit_product') : t('add_product')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="name" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('product_name')}</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="price" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('product_price')}</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="stock" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('product_stock')}</Label>
                                <Input
                                    id="stock"
                                    type="number"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="category" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('product_category')}</Label>
                                <select
                                    id="category"
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: parseInt(e.target.value) })}
                                    className="w-full p-2 border rounded"
                                    required
                                >
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="unit" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('product_unit')}</Label>
                            <select
                                id="unit"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                className="w-full p-2 border rounded"
                                required
                            >
                                <option value="unit_piece">{t('unit_piece')}</option>
                                <option value="unit_kg">{t('unit_kg')}</option>
                                <option value="unit_liter">{t('unit_liter')}</option>
                                <option value="unit_dozen">{t('unit_dozen')}</option>
                                <option value="unit_pack">{t('unit_pack')}</option>
                                <option value="unit_gram">{t('unit_gram')}</option>
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="description" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('product_description')}</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <div>
                            <Label htmlFor="imageUrl" className={i18n.language === 'ar' ? 'text-right block' : ''}>{t('product_image_url')}</Label>
                            <Input
                                id="imageUrl"
                                type="url"
                                value={formData.imageUrl}
                                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                placeholder="https://example.com/image.jpg"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isAvailable"
                                checked={formData.isAvailable}
                                onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                            />
                            <Label htmlFor="isAvailable">{t('product_available')}</Label>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddEditOpen(false)}>
                                {t('cancel')}
                            </Button>
                            <Button type="submit">
                                {t('save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('delete_product')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('confirm_delete')}
                            <br />
                            <strong>{deletingProduct?.name}</strong>
                            <br />
                            {t('delete_warning')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t('delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
