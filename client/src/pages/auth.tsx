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
import { Loader2, Phone, Lock, User, ShoppingBag, Sparkles } from "lucide-react";
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
            className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-primary/10 relative overflow-hidden"
            dir={isRTL ? "rtl" : "ltr"}
        >
            {/* Decorative Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/15 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md p-4 relative z-10 animate-in fade-in zoom-in-95 duration-500">
                {/* Main Card */}
                <div className="bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl rounded-3xl p-6 md:p-8">
                    {/* App Header */}
                    <div className="text-center space-y-3 mb-8">
                        {/* Logo */}
                        <div className="flex justify-center mb-4">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30 p-2">
                                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                            {t('app_name')}
                        </h1>
                        <p className="text-muted-foreground text-sm">{t('app_tagline')}</p>
                    </div>

                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1.5 h-12 rounded-xl">
                            <TabsTrigger
                                value="login"
                                className="rounded-lg text-sm font-bold transition-all data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary"
                            >
                                {t('login')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="register"
                                className="rounded-lg text-sm font-bold transition-all data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary"
                            >
                                {t('register')}
                            </TabsTrigger>
                        </TabsList>

                        {/* Login Tab */}
                        <TabsContent value="login" className="space-y-5 focus-visible:ring-0 outline-none">
                            <div className="flex flex-col items-center justify-center text-center space-y-1">
                                <h2 className="text-xl font-bold">{t('welcome_back')}</h2>
                                <p className="text-sm text-muted-foreground">{t('login_desc')}</p>
                            </div>

                            <Form {...loginForm}>
                                <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                                    <FormField
                                        control={loginForm.control}
                                        name="phoneNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold">{t('phone_number')}</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Phone className={cn(
                                                            "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10",
                                                            isRTL ? "right-4" : "left-4"
                                                        )} />
                                                        <Input
                                                            placeholder="01xxxxxxxxx"
                                                            {...field}
                                                            className={cn(
                                                                "h-12 bg-muted/30 border-border/50 focus:bg-background focus:border-primary/50 transition-all rounded-xl",
                                                                isRTL ? "pr-12 pl-4" : "pl-12 pr-4"
                                                            )}
                                                            style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={loginForm.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold">{t('password')}</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Lock className={cn(
                                                            "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10",
                                                            isRTL ? "right-4" : "left-4"
                                                        )} />
                                                        <Input
                                                            type="password"
                                                            placeholder="••••••••"
                                                            {...field}
                                                            className={cn(
                                                                "h-12 bg-muted/30 border-border/50 focus:bg-background focus:border-primary/50 transition-all rounded-xl",
                                                                isRTL ? "pr-12 pl-4" : "pl-12 pr-4"
                                                            )}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all mt-2"
                                        disabled={loginMutation.isPending}
                                    >
                                        {loginMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                                        {t('login')}
                                    </Button>
                                </form>
                            </Form>
                        </TabsContent>

                        {/* Register Tab */}
                        <TabsContent value="register" className="space-y-5 focus-visible:ring-0 outline-none">
                            <div className="flex flex-col items-center justify-center text-center space-y-1">
                                <h2 className="text-xl font-bold">{t('create_account')}</h2>
                                <p className="text-sm text-muted-foreground">{t('register_desc')}</p>
                            </div>

                            <Form {...registerForm}>
                                <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <FormField
                                            control={registerForm.control}
                                            name="firstName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold">{t('first_name')}</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            className="h-12 bg-muted/30 border-border/50 focus:bg-background focus:border-primary/50 transition-all rounded-xl"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={registerForm.control}
                                            name="lastName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold">{t('last_name')}</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            className="h-12 bg-muted/30 border-border/50 focus:bg-background focus:border-primary/50 transition-all rounded-xl"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={registerForm.control}
                                        name="phoneNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold">{t('phone_number')}</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Phone className={cn(
                                                            "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10",
                                                            isRTL ? "right-4" : "left-4"
                                                        )} />
                                                        <Input
                                                            placeholder="01xxxxxxxxx"
                                                            {...field}
                                                            className={cn(
                                                                "h-12 bg-muted/30 border-border/50 focus:bg-background focus:border-primary/50 transition-all rounded-xl",
                                                                isRTL ? "pr-12 pl-4" : "pl-12 pr-4"
                                                            )}
                                                            style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={registerForm.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold">{t('password')}</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Lock className={cn(
                                                            "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10",
                                                            isRTL ? "right-4" : "left-4"
                                                        )} />
                                                        <Input
                                                            type="password"
                                                            placeholder="••••••••"
                                                            {...field}
                                                            className={cn(
                                                                "h-12 bg-muted/30 border-border/50 focus:bg-background focus:border-primary/50 transition-all rounded-xl",
                                                                isRTL ? "pr-12 pl-4" : "pl-12 pr-4"
                                                            )}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all mt-2"
                                        disabled={registerMutation.isPending}
                                    >
                                        {registerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                                        {t('register')}
                                    </Button>
                                </form>
                            </Form>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Features */}
                <div className="mt-6 grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/30">
                        <ShoppingBag className="w-5 h-5 mx-auto mb-1.5 text-primary" />
                        <p className="text-xs font-medium text-muted-foreground">{t('easy_shopping')}</p>
                    </div>
                    <div className="text-center p-3 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/30">
                        <Sparkles className="w-5 h-5 mx-auto mb-1.5 text-primary" />
                        <p className="text-xs font-medium text-muted-foreground">{t('fast_delivery')}</p>
                    </div>
                    <div className="text-center p-3 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/30">
                        <Lock className="w-5 h-5 mx-auto mb-1.5 text-primary" />
                        <p className="text-xs font-medium text-muted-foreground">{t('secure_payment')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
