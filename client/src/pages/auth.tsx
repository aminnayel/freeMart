import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Loader2, Phone, Lock, User, ShoppingBag, Sparkles, Truck, Shield } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
    phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(2, "Last name is required"),
    phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function AuthPage() {
    const [, setLocation] = useLocation();
    const { user } = useAuth();
    const { toast } = useToast();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    if (user) {
        setLocation("/");
        return null;
    }

    const loginForm = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            phoneNumber: "",
            password: "",
        },
    });

    const registerForm = useForm<z.infer<typeof registerSchema>>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            phoneNumber: "",
            password: "",
        },
    });

    const loginMutation = useMutation({
        mutationFn: async (data: z.infer<typeof loginSchema>) => {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.text();
                throw new Error(error);
            }
            return res.json();
        },
        onSuccess: (user) => {
            queryClient.setQueryData(["/api/auth/user"], user);
            toast({ title: t('welcome_back') });
            setLocation("/");
        },
        onError: (error: Error) => {
            toast({
                title: t('login_failed'),
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const registerMutation = useMutation({
        mutationFn: async (data: z.infer<typeof registerSchema>) => {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.text();
                throw new Error(error);
            }
            return res.json();
        },
        onSuccess: (user) => {
            queryClient.setQueryData(["/api/auth/user"], user);
            toast({ title: t('account_created') });
            setLocation("/");
        },
        onError: (error: Error) => {
            toast({
                title: t('registration_failed'),
                description: error.message,
                variant: "destructive",
            });
        },
    });

    return (
        <div
            className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-primary/5 dark:from-slate-950 dark:via-slate-900 dark:to-primary/10 relative overflow-hidden px-4 py-8"
            dir={isRTL ? "rtl" : "ltr"}
        >
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-primary/30 to-primary/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-3xl" />
                <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
                {/* Decorative grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)]" />
            </div>

            <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Logo & Branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center mb-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl scale-150" />
                            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-2xl shadow-primary/20 flex items-center justify-center p-3 border border-white/50">
                                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                        </div>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
                        {t('app_name')}
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">{t('app_tagline')}</p>
                </div>

                {/* Main Auth Card */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl shadow-slate-200/50 dark:shadow-black/20 rounded-3xl p-6 md:p-8">
                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100/80 dark:bg-slate-800/80 p-1.5 h-14 rounded-2xl">
                            <TabsTrigger
                                value="login"
                                className="rounded-xl text-sm font-bold transition-all duration-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-lg data-[state=active]:text-primary h-full"
                            >
                                {t('login')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="register"
                                className="rounded-xl text-sm font-bold transition-all duration-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-lg data-[state=active]:text-primary h-full"
                            >
                                {t('register')}
                            </TabsTrigger>
                        </TabsList>

                        {/* Login Tab */}
                        <TabsContent value="login" className="space-y-6 focus-visible:ring-0 outline-none mt-0">
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {isRTL ? 'مرحباً بعودتك' : 'Welcome Back'}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {isRTL ? 'سجّل دخولك للمتابعة' : 'Sign in to continue shopping'}
                                </p>
                            </div>

                            <Form {...loginForm}>
                                <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-5">
                                    <FormField
                                        control={loginForm.control}
                                        name="phoneNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className={cn("font-semibold text-slate-700 dark:text-slate-300", isRTL && "block text-right")}>{t('phone_number')}</FormLabel>
                                                <FormControl>
                                                    <div className="relative group">
                                                        <div className={cn(
                                                            "absolute top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-focus-within:bg-primary group-focus-within:text-white",
                                                            isRTL ? "right-1.5" : "left-1.5"
                                                        )}>
                                                            <Phone className="h-4 w-4" />
                                                        </div>
                                                        <Input
                                                            placeholder="01xxxxxxxxx"
                                                            {...field}
                                                            className={cn(
                                                                "h-14 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all rounded-2xl text-base",
                                                                isRTL ? "pr-14 pl-4 text-right" : "pl-14 pr-4"
                                                            )}
                                                            style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage className={isRTL ? "text-right" : ""} />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={loginForm.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className={cn("font-semibold text-slate-700 dark:text-slate-300", isRTL && "block text-right")}>{t('password')}</FormLabel>
                                                <FormControl>
                                                    <div className="relative group">
                                                        <div className={cn(
                                                            "absolute top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-focus-within:bg-primary group-focus-within:text-white",
                                                            isRTL ? "right-1.5" : "left-1.5"
                                                        )}>
                                                            <Lock className="h-4 w-4" />
                                                        </div>
                                                        <Input
                                                            type="password"
                                                            placeholder="••••••••"
                                                            {...field}
                                                            className={cn(
                                                                "h-14 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all rounded-2xl text-base",
                                                                isRTL ? "pr-14 pl-4 text-right" : "pl-14 pr-4"
                                                            )}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage className={isRTL ? "text-right" : ""} />
                                            </FormItem>
                                        )}
                                    />
                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="w-full h-14 rounded-2xl text-base font-bold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                                        disabled={loginMutation.isPending}
                                    >
                                        {loginMutation.isPending && <Loader2 className="h-5 w-5 animate-spin me-2" />}
                                        {t('login')}
                                    </Button>
                                </form>
                            </Form>
                        </TabsContent>

                        {/* Register Tab */}
                        <TabsContent value="register" className="space-y-6 focus-visible:ring-0 outline-none mt-0">
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {isRTL ? 'إنشاء حساب جديد' : 'Create Account'}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {isRTL ? 'سجّل الآن وابدأ التسوق' : 'Join us and start shopping'}
                                </p>
                            </div>

                            <Form {...registerForm}>
                                <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <FormField
                                            control={registerForm.control}
                                            name="firstName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className={cn("font-semibold text-slate-700 dark:text-slate-300", isRTL && "block text-right")}>{t('first_name')}</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            className={cn(
                                                                "h-12 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all rounded-xl",
                                                                isRTL && "text-right"
                                                            )}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className={isRTL ? "text-right" : ""} />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={registerForm.control}
                                            name="lastName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className={cn("font-semibold text-slate-700 dark:text-slate-300", isRTL && "block text-right")}>{t('last_name')}</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            className={cn(
                                                                "h-12 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all rounded-xl",
                                                                isRTL && "text-right"
                                                            )}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className={isRTL ? "text-right" : ""} />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={registerForm.control}
                                        name="phoneNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className={cn("font-semibold text-slate-700 dark:text-slate-300", isRTL && "block text-right")}>{t('phone_number')}</FormLabel>
                                                <FormControl>
                                                    <div className="relative group">
                                                        <div className={cn(
                                                            "absolute top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-focus-within:bg-primary group-focus-within:text-white",
                                                            isRTL ? "right-1.5" : "left-1.5"
                                                        )}>
                                                            <Phone className="h-4 w-4" />
                                                        </div>
                                                        <Input
                                                            placeholder="01xxxxxxxxx"
                                                            {...field}
                                                            className={cn(
                                                                "h-14 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all rounded-2xl text-base",
                                                                isRTL ? "pr-14 pl-4 text-right" : "pl-14 pr-4"
                                                            )}
                                                            style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage className={isRTL ? "text-right" : ""} />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={registerForm.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className={cn("font-semibold text-slate-700 dark:text-slate-300", isRTL && "block text-right")}>{t('password')}</FormLabel>
                                                <FormControl>
                                                    <div className="relative group">
                                                        <div className={cn(
                                                            "absolute top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-focus-within:bg-primary group-focus-within:text-white",
                                                            isRTL ? "right-1.5" : "left-1.5"
                                                        )}>
                                                            <Lock className="h-4 w-4" />
                                                        </div>
                                                        <Input
                                                            type="password"
                                                            placeholder="••••••••"
                                                            {...field}
                                                            className={cn(
                                                                "h-14 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all rounded-2xl text-base",
                                                                isRTL ? "pr-14 pl-4 text-right" : "pl-14 pr-4"
                                                            )}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage className={isRTL ? "text-right" : ""} />
                                            </FormItem>
                                        )}
                                    />
                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="w-full h-14 rounded-2xl text-base font-bold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] mt-2"
                                        disabled={registerMutation.isPending}
                                    >
                                        {registerMutation.isPending && <Loader2 className="h-5 w-5 animate-spin me-2" />}
                                        {t('register')}
                                    </Button>
                                </form>
                            </Form>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Trust Badges */}
                <div className="mt-8 grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-slate-200/20 dark:shadow-black/10 transition-transform hover:scale-105">
                        <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Truck className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            {isRTL ? 'توصيل سريع' : 'Fast Delivery'}
                        </p>
                    </div>
                    <div className="text-center p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-slate-200/20 dark:shadow-black/10 transition-transform hover:scale-105">
                        <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            {isRTL ? 'دفع آمن' : 'Secure Pay'}
                        </p>
                    </div>
                    <div className="text-center p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-slate-200/20 dark:shadow-black/10 transition-transform hover:scale-105">
                        <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            {isRTL ? 'جودة عالية' : 'Quality'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
