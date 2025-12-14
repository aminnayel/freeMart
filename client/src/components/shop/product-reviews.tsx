import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import {
    Star,
    User,
    Send,
    MessageSquare,
    CheckCircle,
    Loader2,
    X,
    ChevronDown,
    ChevronUp,
    ThumbsUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Review {
    id: number;
    userId: string;
    productId: number;
    rating: number;
    title: string | null;
    comment: string | null;
    isVerifiedPurchase: boolean;
    createdAt: Date;
    user: {
        firstName: string | null;
        lastName: string | null;
    };
}

interface ProductRating {
    average: number;
    count: number;
}

interface ProductReviewsProps {
    productId: number;
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { user, isAuthenticated } = useAuth();

    const [showForm, setShowForm] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [title, setTitle] = useState("");
    const [comment, setComment] = useState("");

    // Fetch reviews
    const { data: reviews = [], isLoading: reviewsLoading } = useQuery<Review[]>({
        queryKey: [`/api/products/${productId}/reviews`],
    });

    // Fetch rating
    const { data: ratingData } = useQuery<ProductRating>({
        queryKey: [`/api/products/${productId}/rating`],
    });

    const submitReviewMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`/api/products/${productId}/reviews`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to submit review");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/reviews`] });
            queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/rating`] });
            toast({
                title: isRTL ? "✓ تم الإرسال" : "✓ Submitted",
                description: isRTL ? "شكراً على تقييمك" : "Thank you for your review",
            });
            setShowForm(false);
            setRating(5);
            setTitle("");
            setComment("");
        },
        onError: () => {
            toast({
                title: isRTL ? "خطأ" : "Error",
                description: isRTL ? "فشل إرسال التقييم" : "Failed to submit review",
                variant: "destructive",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitReviewMutation.mutate({
            rating,
            title: title || null,
            comment: comment || null,
        });
    };

    const renderStars = (count: number, interactive = false, size: 'sm' | 'md' | 'lg' = 'md') => {
        const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';

        return (
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={cn(
                            sizeClass,
                            "transition-all duration-150",
                            star <= (interactive ? (hoverRating || rating) : count)
                                ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                                : 'text-slate-200 dark:text-slate-700',
                            interactive && 'cursor-pointer hover:scale-125 active:scale-95'
                        )}
                        onClick={interactive ? () => setRating(star) : undefined}
                        onMouseEnter={interactive ? () => setHoverRating(star) : undefined}
                        onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
                    />
                ))}
            </div>
        );
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Calculate rating distribution
    const getRatingDistribution = () => {
        const distribution = [0, 0, 0, 0, 0]; // 5, 4, 3, 2, 1 stars
        reviews.forEach(r => {
            if (r.rating >= 1 && r.rating <= 5) {
                distribution[5 - r.rating]++;
            }
        });
        return distribution;
    };

    if (reviewsLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    const distribution = getRatingDistribution();
    const avgRating = ratingData?.average || 0;
    const totalReviews = ratingData?.count || 0;

    return (
        <div className="space-y-3">
            {/* Collapsible Header - Premium Style */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-900/20 dark:to-orange-900/10 rounded-2xl border border-amber-100/50 dark:border-amber-800/20 hover:shadow-md transition-all active:scale-[0.99] group"
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        {renderStars(Math.round(avgRating), false, 'sm')}
                        <span className="font-bold text-xl text-amber-600 dark:text-amber-400">
                            {avgRating.toFixed(1)}
                        </span>
                    </div>
                    <div className="h-5 w-px bg-amber-200 dark:bg-amber-700" />
                    <span className="text-sm text-muted-foreground font-medium">
                        {totalReviews} {isRTL ? 'تقييم' : 'reviews'}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                    <span className="text-sm font-medium hidden sm:block">
                        {isRTL ? 'عرض التقييمات' : 'View Reviews'}
                    </span>
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                    ) : (
                        <ChevronDown className="w-5 h-5" />
                    )}
                </div>
            </button>

            {/* Collapsible Content */}
            {isExpanded && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    {/* Rating Summary Card */}
                    <Card className="p-5 lg:p-6 border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Left: Big Score */}
                            <div className="flex flex-col items-center justify-center text-center lg:min-w-[140px] py-4 lg:py-0">
                                <div className="text-5xl lg:text-6xl font-bold text-amber-500 mb-2">
                                    {avgRating.toFixed(1)}
                                </div>
                                {renderStars(Math.round(avgRating), false, 'md')}
                                <p className="text-sm text-muted-foreground mt-2">
                                    {totalReviews} {isRTL ? 'تقييم' : 'ratings'}
                                </p>
                            </div>

                            {/* Right: Rating Breakdown */}
                            <div className="flex-1 space-y-2">
                                {[5, 4, 3, 2, 1].map((stars, idx) => {
                                    const count = distribution[idx];
                                    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                                    return (
                                        <div key={stars} className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-muted-foreground w-6">{stars}</span>
                                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                            <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Write Review Button */}
                        {isAuthenticated && !showForm && (
                            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                                <Button
                                    onClick={() => setShowForm(true)}
                                    className="w-full lg:w-auto gap-2 h-11 rounded-xl shadow-md hover:shadow-lg transition-all"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    {isRTL ? 'اكتب تقييمك' : 'Write a Review'}
                                </Button>
                            </div>
                        )}
                    </Card>

                    {/* Review Form */}
                    {showForm && (
                        <Card className="p-5 lg:p-6 border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />

                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "absolute top-4 h-8 w-8 rounded-full hover:bg-red-100 hover:text-red-600",
                                    isRTL ? "left-4" : "right-4"
                                )}
                                onClick={() => setShowForm(false)}
                            >
                                <X className="w-4 h-4" />
                            </Button>

                            <h3 className="font-bold text-lg mb-6">{isRTL ? 'شاركنا رأيك' : 'Share Your Experience'}</h3>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Star Rating */}
                                <div className="flex flex-col items-center gap-3 py-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 rounded-2xl border border-amber-100/50 dark:border-amber-800/30">
                                    <p className="text-sm text-muted-foreground font-medium">
                                        {isRTL ? 'ما تقييمك للمنتج؟' : 'How would you rate it?'}
                                    </p>
                                    {renderStars(rating, true, 'lg')}
                                    <Badge variant="secondary" className={cn(
                                        "mt-1 font-medium",
                                        rating >= 4 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                            rating >= 3 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                                "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    )}>
                                        {rating === 5 ? (isRTL ? '⭐ ممتاز!' : '⭐ Excellent!') :
                                            rating === 4 ? (isRTL ? 'جيد جداً' : 'Very Good') :
                                                rating === 3 ? (isRTL ? 'جيد' : 'Good') :
                                                    rating === 2 ? (isRTL ? 'مقبول' : 'Fair') :
                                                        (isRTL ? 'سيء' : 'Poor')}
                                    </Badge>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2">
                                        {isRTL ? 'عنوان التقييم' : 'Review Title'} <span className="text-muted-foreground font-normal">({isRTL ? 'اختياري' : 'optional'})</span>
                                    </label>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder={isRTL ? "ملخص تجربتك مع المنتج" : "Summarize your experience"}
                                        className="h-12 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-primary"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2">
                                        {isRTL ? 'تفاصيل التقييم' : 'Your Review'} <span className="text-muted-foreground font-normal">({isRTL ? 'اختياري' : 'optional'})</span>
                                    </label>
                                    <Textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder={isRTL ? "أخبرنا عن تجربتك مع هذا المنتج..." : "Tell us about your experience..."}
                                        className="rounded-xl resize-none min-h-[100px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-primary"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={submitReviewMutation.isPending}
                                    className="w-full h-12 rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all text-base font-semibold"
                                >
                                    {submitReviewMutation.isPending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            {isRTL ? 'إرسال التقييم' : 'Submit Review'}
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Card>
                    )}

                    {/* Reviews List */}
                    <div className="space-y-3">
                        {reviews.map((review) => (
                            <Card key={review.id} className="p-4 lg:p-5 border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl hover:shadow-lg transition-shadow">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 ring-2 ring-primary/10">
                                        <span className="text-sm font-bold text-primary">
                                            {(review.user.firstName?.[0] || review.user.lastName?.[0] || 'U').toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-sm">
                                                {review.user.firstName || review.user.lastName
                                                    ? `${review.user.firstName || ''} ${review.user.lastName || ''}`.trim()
                                                    : (isRTL ? 'مستخدم' : 'Customer')
                                                }
                                            </span>
                                            {review.isVerifiedPurchase && (
                                                <Badge variant="secondary" className="text-[10px] h-5 gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                                                    <CheckCircle className="w-3 h-3" />
                                                    {isRTL ? 'مشتري موثق' : 'Verified'}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            {renderStars(review.rating, false, 'sm')}
                                            <span className="text-[11px] text-muted-foreground">
                                                {formatDate(review.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {review.title && (
                                    <h4 className="font-semibold text-sm mb-2">{review.title}</h4>
                                )}

                                {review.comment && (
                                    <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                                )}
                            </Card>
                        ))}

                        {reviews.length === 0 && !showForm && (
                            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/20 rounded-full flex items-center justify-center">
                                    <MessageSquare className="w-8 h-8 text-amber-500" />
                                </div>
                                <h4 className="font-semibold mb-2">{isRTL ? 'لا توجد تقييمات بعد' : 'No reviews yet'}</h4>
                                <p className="text-muted-foreground text-sm mb-4 max-w-xs mx-auto">
                                    {isRTL ? 'كن أول من يشارك تجربته مع هذا المنتج' : 'Be the first to share your experience'}
                                </p>
                                {isAuthenticated && (
                                    <Button
                                        onClick={() => setShowForm(true)}
                                        className="rounded-xl shadow-md gap-2"
                                    >
                                        <ThumbsUp className="w-4 h-4" />
                                        {isRTL ? 'أضف تقييمك' : 'Add Review'}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

