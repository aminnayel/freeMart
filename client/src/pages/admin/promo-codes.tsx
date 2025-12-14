import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
    Tag,
    Plus,
    Trash2,
    Edit2,
    Percent,
    DollarSign,
    Users,
    Copy,
    CheckCircle,
    Loader2,
    Ticket
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface PromoCode {
    id: number;
    code: string;
    description: string | null;
    discountType: 'percentage' | 'fixed';
    discountValue: string;
    minimumOrder: string;
    maximumDiscount: string | null;
    maxUses: number | null;
    usedCount: number;
    maxUsesPerUser: number;
    startsAt: Date | null;
    expiresAt: Date | null;
    isActive: boolean;
    createdAt: Date;
}

export default function AdminPromoCodes() {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Form state
    const [code, setCode] = useState("");
    const [description, setDescription] = useState("");
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [discountValue, setDiscountValue] = useState("");
    const [minimumOrder, setMinimumOrder] = useState("");
    const [maximumDiscount, setMaximumDiscount] = useState("");
    const [maxUses, setMaxUses] = useState("");
    const [maxUsesPerUser, setMaxUsesPerUser] = useState("1");
    const [isActive, setIsActive] = useState(true);

    // Fetch promo codes
    const { data: promoCodes = [], isLoading } = useQuery<PromoCode[]>({
        queryKey: ["/api/admin/promo-codes"],
    });

    const resetForm = () => {
        setCode("");
        setDescription("");
        setDiscountType('percentage');
        setDiscountValue("");
        setMinimumOrder("");
        setMaximumDiscount("");
        setMaxUses("");
        setMaxUsesPerUser("1");
        setIsActive(true);
        setEditingPromo(null);
    };

    const openEditDialog = (promo: PromoCode) => {
        setEditingPromo(promo);
        setCode(promo.code);
        setDescription(promo.description || "");
        setDiscountType(promo.discountType);
        setDiscountValue(promo.discountValue);
        setMinimumOrder(promo.minimumOrder || "");
        setMaximumDiscount(promo.maximumDiscount || "");
        setMaxUses(promo.maxUses?.toString() || "");
        setMaxUsesPerUser(promo.maxUsesPerUser.toString());
        setIsActive(promo.isActive);
        setIsDialogOpen(true);
    };

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const url = editingPromo
                ? `/api/admin/promo-codes/${editingPromo.id}`
                : "/api/admin/promo-codes";
            const method = editingPromo ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to save promo code");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
            toast({
                title: isRTL ? "✓ تم الحفظ" : "✓ Saved",
                description: isRTL ? "تم حفظ كود الخصم بنجاح" : "Promo code saved successfully",
            });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: () => {
            toast({
                title: isRTL ? "خطأ" : "Error",
                description: isRTL ? "فشل حفظ كود الخصم" : "Failed to save promo code",
                variant: "destructive",
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/admin/promo-codes/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to delete promo code");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
            toast({
                title: isRTL ? "تم الحذف" : "Deleted",
                description: isRTL ? "تم حذف كود الخصم" : "Promo code deleted",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        createMutation.mutate({
            code: code.toUpperCase(),
            description,
            discountType,
            discountValue,
            minimumOrder: minimumOrder || "0",
            maximumDiscount: maximumDiscount || null,
            maxUses: maxUses ? parseInt(maxUses) : null,
            maxUsesPerUser: parseInt(maxUsesPerUser) || 1,
            isActive,
        });
    };

    const copyCode = (promoCode: string) => {
        navigator.clipboard.writeText(promoCode);
        setCopiedCode(promoCode);
        toast({
            title: isRTL ? 'تم النسخ' : 'Copied!',
            description: promoCode,
        });
        setTimeout(() => setCopiedCode(null), 2000);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 lg:space-y-6 pb-20 lg:pb-0">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <h1 className="text-xl lg:text-2xl font-bold truncate">{isRTL ? 'أكواد الخصم' : 'Promo Codes'}</h1>
                    <p className="text-muted-foreground text-xs lg:text-sm">
                        {promoCodes.length} {isRTL ? 'كود' : 'codes'}
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 h-10 px-4 rounded-xl shadow-sm active:scale-95 transition-transform">
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">{isRTL ? 'إضافة كود' : 'Add Code'}</span>
                            <span className="sm:hidden">{isRTL ? 'إضافة' : 'Add'}</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border-0">
                        <DialogHeader>
                            <DialogTitle className="text-lg">
                                {editingPromo
                                    ? (isRTL ? 'تعديل كود الخصم' : 'Edit Promo Code')
                                    : (isRTL ? 'إضافة كود جديد' : 'New Promo Code')
                                }
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm">{isRTL ? 'الكود' : 'Code'}</Label>
                                <Input
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="WELCOME10"
                                    className="uppercase h-11 rounded-xl bg-muted/50 border-0"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">{isRTL ? 'الوصف (اختياري)' : 'Description (optional)'}</Label>
                                <Input
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={isRTL ? "خصم للمستخدمين الجدد" : "Discount for new users"}
                                    className="h-11 rounded-xl bg-muted/50 border-0"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-sm">{isRTL ? 'نوع الخصم' : 'Type'}</Label>
                                    <Select value={discountType} onValueChange={(v: 'percentage' | 'fixed') => setDiscountType(v)}>
                                        <SelectTrigger className="h-11 rounded-xl bg-muted/50 border-0">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percentage">
                                                <div className="flex items-center gap-2">
                                                    <Percent className="w-4 h-4" />
                                                    {isRTL ? 'نسبة' : '%'}
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="fixed">
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="w-4 h-4" />
                                                    {isRTL ? 'ثابت' : 'Fixed'}
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm">{isRTL ? 'القيمة' : 'Value'}</Label>
                                    <Input
                                        type="number"
                                        value={discountValue}
                                        onChange={(e) => setDiscountValue(e.target.value)}
                                        placeholder={discountType === 'percentage' ? "10" : "50"}
                                        className="h-11 rounded-xl bg-muted/50 border-0"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-sm">{isRTL ? 'حد أدنى' : 'Min. Order'}</Label>
                                    <Input
                                        type="number"
                                        value={minimumOrder}
                                        onChange={(e) => setMinimumOrder(e.target.value)}
                                        placeholder="100"
                                        className="h-11 rounded-xl bg-muted/50 border-0"
                                    />
                                </div>

                                {discountType === 'percentage' && (
                                    <div className="space-y-2">
                                        <Label className="text-sm">{isRTL ? 'أقصى خصم' : 'Max Discount'}</Label>
                                        <Input
                                            type="number"
                                            value={maximumDiscount}
                                            onChange={(e) => setMaximumDiscount(e.target.value)}
                                            placeholder="50"
                                            className="h-11 rounded-xl bg-muted/50 border-0"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-sm">{isRTL ? 'عدد الاستخدام' : 'Max Uses'}</Label>
                                    <Input
                                        type="number"
                                        value={maxUses}
                                        onChange={(e) => setMaxUses(e.target.value)}
                                        placeholder="∞"
                                        className="h-11 rounded-xl bg-muted/50 border-0"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm">{isRTL ? 'لكل مستخدم' : 'Per User'}</Label>
                                    <Input
                                        type="number"
                                        value={maxUsesPerUser}
                                        onChange={(e) => setMaxUsesPerUser(e.target.value)}
                                        placeholder="1"
                                        className="h-11 rounded-xl bg-muted/50 border-0"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                                <Label htmlFor="active" className="text-sm font-medium cursor-pointer">
                                    {isRTL ? 'الكود مفعل' : 'Active'}
                                </Label>
                                <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 rounded-xl text-base font-medium shadow-sm active:scale-[0.98] transition-transform"
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    isRTL ? 'حفظ' : 'Save'
                                )}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Promo Codes List */}
            <div className="space-y-3">
                {promoCodes.map((promo) => (
                    <Card
                        key={promo.id}
                        className={cn(
                            "p-4 lg:p-5 border-0 shadow-sm bg-white dark:bg-slate-900 rounded-2xl",
                            "active:scale-[0.995] transition-transform"
                        )}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            {/* Icon & Main Info */}
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className={cn(
                                    "p-2.5 lg:p-3 rounded-xl shrink-0",
                                    promo.discountType === 'percentage'
                                        ? 'bg-purple-100 dark:bg-purple-900/30'
                                        : 'bg-green-100 dark:bg-green-900/30'
                                )}>
                                    {promo.discountType === 'percentage'
                                        ? <Percent className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
                                        : <DollarSign className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="font-mono font-bold text-base lg:text-lg">{promo.code}</span>
                                        <Badge
                                            variant={promo.isActive ? "default" : "secondary"}
                                            className={cn(
                                                "text-[10px] h-5",
                                                promo.isActive && "bg-green-500"
                                            )}
                                        >
                                            {promo.isActive ? (isRTL ? 'مفعل' : 'Active') : (isRTL ? 'معطل' : 'Off')}
                                        </Badge>
                                    </div>
                                    {promo.description && (
                                        <p className="text-xs lg:text-sm text-muted-foreground mb-2 truncate">{promo.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-1.5">
                                        <Badge variant="outline" className="text-[10px] lg:text-xs rounded-lg">
                                            {promo.discountType === 'percentage'
                                                ? `${promo.discountValue}%`
                                                : `${promo.discountValue} ${isRTL ? 'ج' : 'EGP'}`
                                            }
                                        </Badge>
                                        {parseFloat(promo.minimumOrder || "0") > 0 && (
                                            <Badge variant="outline" className="text-[10px] lg:text-xs rounded-lg">
                                                {isRTL ? 'حد' : 'Min'}: {promo.minimumOrder}
                                            </Badge>
                                        )}
                                        <Badge variant="outline" className="text-[10px] lg:text-xs rounded-lg flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {promo.usedCount}/{promo.maxUses || '∞'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 sm:flex-col">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-xl hover:bg-primary/10 active:scale-90 transition-all"
                                    onClick={() => copyCode(promo.code)}
                                >
                                    {copiedCode === promo.code ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-xl hover:bg-primary/10 active:scale-90 transition-all"
                                    onClick={() => openEditDialog(promo)}
                                >
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10 active:scale-90 transition-all"
                                    onClick={() => deleteMutation.mutate(promo.id)}
                                    disabled={deleteMutation.isPending}
                                >
                                    {deleteMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}

                {promoCodes.length === 0 && (
                    <Card className="p-8 lg:p-12 border-0 shadow-sm bg-white dark:bg-slate-900 text-center rounded-2xl">
                        <div className="w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/10 rounded-full flex items-center justify-center">
                            <Ticket className="w-8 h-8 lg:w-10 lg:h-10 text-purple-400" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">{isRTL ? 'لا توجد أكواد خصم' : 'No Promo Codes'}</h3>
                        <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                            {isRTL ? 'أضف أول كود خصم لعملائك' : 'Create your first promo code to offer discounts'}
                        </p>
                        <Button
                            onClick={() => setIsDialogOpen(true)}
                            className="rounded-xl h-11 px-6 shadow-sm active:scale-95 transition-transform"
                        >
                            <Plus className="w-4 h-4 me-2" />
                            {isRTL ? 'إضافة كود' : 'Add Code'}
                        </Button>
                    </Card>
                )}
            </div>
        </div>
    );
}
