import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Loader2, Phone, Lock, User, ArrowRight } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

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
            toast({ title: t('welcome_back') || "Welcome back!" });
            setLocation("/");
        },
        onError: (error: Error) => {
            toast({
                title: t('login_failed') || "Login failed",
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
            toast({ title: t('account_created') || "Account created successfully!" });
            setLocation("/");
        },
        onError: (error: Error) => {
            toast({
                title: t('registration_failed') || "Registration failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=2600&auto=format&fit=crop')] bg-cover bg-center relative font-sans">
            {/* Dark Overlay for better contrast */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

            <div className="w-full max-w-md p-4 relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="bg-card/95 backdrop-blur-md border shadow-2xl rounded-3xl p-6 md:p-8">
                    {/* App Header - Centered */}
                    <div className="text-center space-y-2 mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-2xl">✨</span>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                            {t('app_name')}
                        </h1>
                        <p className="text-muted-foreground font-medium">{t('app_tagline')}</p>
                    </div>

                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/60 p-1 h-12 rounded-xl">
                            <TabsTrigger value="login" className="rounded-lg text-sm font-bold transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary">
                                {t('login')}
                            </TabsTrigger>
                            <TabsTrigger value="register" className="rounded-lg text-sm font-bold transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary">
                                {t('register')}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="login" className="space-y-6 focus-visible:ring-0 outline-none">
                            <div className="text-right space-y-1">
                                <h2 className="text-xl font-bold tracking-tight">{t('welcome_back')}</h2>
                                <p className="text-sm text-muted-foreground">{t('login_desc') || "Enter your phone number to continue"}</p>
                            </div>
                            <Form {...loginForm}>
                                <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                                    <FormField
                                        control={loginForm.control}
                                        name="phoneNumber"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="w-full text-right block font-semibold">{t('phone_number')}</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Phone className="absolute left-3 top-[0.9rem] h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto z-10" />
                                                        <Input
                                                            placeholder="01xxxxxxxxx"
                                                            {...field}
                                                            className="h-12 ps-10 rtl:pe-10 rtl:ps-4 bg-muted/40 border-input/60 focus:bg-background focus:border-primary/50 transition-all rounded-xl font-medium"
                                                            style={{ direction: 'ltr' }}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage className="text-right" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={loginForm.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="w-full text-right block font-semibold">{t('password')}</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-[0.9rem] h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto z-10" />
                                                        <Input
                                                            type="password"
                                                            {...field}
                                                            className="h-12 ps-10 rtl:pe-10 rtl:ps-4 bg-muted/40 border-input/60 focus:bg-background focus:border-primary/50 transition-all rounded-xl"
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage className="text-right" />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" size="lg" className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all mt-4" disabled={loginMutation.isPending}>
                                        {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {t('login')}
                                        {!loginMutation.isPending && <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" />}
                                    </Button>
                                </form>
                            </Form>
                        </TabsContent>

                        <TabsContent value="register" className="space-y-6 focus-visible:ring-0 outline-none">
                            <div className="text-right space-y-1">
                                <h2 className="text-xl font-bold tracking-tight">{t('create_account')}</h2>
                                <p className="text-sm text-muted-foreground">{t('register_desc') || "Get started with your free account"}</p>
                            </div>
                            <Form {...registerForm}>
                                <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={registerForm.control}
                                            name="firstName"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <FormLabel className="w-full text-right block font-semibold">{t('first_name')}</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} className="h-12 bg-muted/40 border-input/60 focus:bg-background focus:border-primary/50 transition-all rounded-xl text-right" />
                                                    </FormControl>
                                                    <FormMessage className="text-right" />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={registerForm.control}
                                            name="lastName"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <FormLabel className="w-full text-right block font-semibold">{t('last_name')}</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} className="h-12 bg-muted/40 border-input/60 focus:bg-background focus:border-primary/50 transition-all rounded-xl text-right" />
                                                    </FormControl>
                                                    <FormMessage className="text-right" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={registerForm.control}
                                        name="phoneNumber"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="w-full text-right block font-semibold">{t('phone_number')}</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Phone className="absolute left-3 top-[0.9rem] h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto z-10" />
                                                        <Input
                                                            placeholder="01xxxxxxxxx"
                                                            {...field}
                                                            className="h-12 ps-10 rtl:pe-10 rtl:ps-4 bg-muted/40 border-input/60 focus:bg-background focus:border-primary/50 transition-all rounded-xl font-medium"
                                                            style={{ direction: 'ltr' }}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage className="text-right" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={registerForm.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="w-full text-right block font-semibold">{t('password')}</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-[0.9rem] h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto z-10" />
                                                        <Input
                                                            type="password"
                                                            {...field}
                                                            className="h-12 ps-10 rtl:pe-10 rtl:ps-4 bg-muted/40 border-input/60 focus:bg-background focus:border-primary/50 transition-all rounded-xl"
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage className="text-right" />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" size="lg" className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all mt-4" disabled={registerMutation.isPending}>
                                        {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {t('register')}
                                        {!registerMutation.isPending && <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" />}
                                    </Button>
                                </form>
                            </Form>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
