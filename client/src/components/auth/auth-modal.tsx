import { useState, useEffect } from "react";
import { useAuthModal } from "./auth-modal-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Loader2, Phone, Lock, User, ArrowRight, ArrowLeft, X, Shield, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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

// Floating Particle Component
const FloatingParticle = ({ delay, duration, size, className }: { delay: number; duration: number; size: number; className?: string }) => (
    <motion.div
        className={cn("absolute rounded-full blur-xl opacity-20", className)}
        style={{ width: size, height: size }}
        animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
            scale: [1, 1.05, 1],
        }}
        transition={{
            duration,
            delay,
            repeat: Infinity,
            ease: "easeInOut",
        }}
    />
);

export function AuthModal() {
    const { isOpen, view, close, toggleView, redirectPath } = useAuthModal();
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const isMobile = useIsMobile();

    const loginForm = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: { phoneNumber: "", password: "" },
    });

    const registerForm = useForm<z.infer<typeof registerSchema>>({
        resolver: zodResolver(registerSchema),
        defaultValues: { firstName: "", lastName: "", phoneNumber: "", password: "" },
    });

    // Reset forms when modal closes
    useEffect(() => {
        if (!isOpen) {
            loginForm.reset();
            registerForm.reset();
        }
    }, [isOpen]);

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
            close();
            if (redirectPath) {
                setLocation(redirectPath);
            }
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
            close();
            if (redirectPath) {
                setLocation(redirectPath);
            }
        },
        onError: (error: Error) => {
            toast({
                title: t('registration_failed'),
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Animation variants
    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 100 : -100,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 100 : -100,
            opacity: 0,
        }),
    };

    const direction = view === 'register' ? 1 : -1;

    // Premium Input Component
    const PremiumInput = ({ icon: Icon, ...props }: any) => (
        <div className="relative group">
            <div className={cn(
                "absolute top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-muted-foreground/50 transition-all duration-300 group-focus-within:text-primary group-focus-within:scale-110",
                isRTL ? "right-0" : "left-0"
            )}>
                <Icon className="h-5 w-5" />
            </div>
            <Input
                {...props}
                className={cn(
                    "h-14 bg-white/50 dark:bg-slate-800/50 border-2 border-transparent",
                    "focus:border-primary/50 focus:bg-white dark:focus:bg-slate-800",
                    "transition-all duration-300 rounded-2xl text-base",
                    "placeholder:text-muted-foreground/40",
                    "shadow-sm focus:shadow-lg focus:shadow-primary/10",
                    isRTL ? "pr-14 text-right" : "pl-14",
                    props.className
                )}
            />
            {/* Gradient glow on focus */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10 blur-xl bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20" />
        </div>
    );

    const Content = () => (
        <div className="relative flex flex-col items-center min-h-[600px] overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Main gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800" />

                {/* Animated mesh gradient */}
                <div className="absolute inset-0 opacity-50">
                    <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-primary/40 via-emerald-500/20 to-transparent rounded-full blur-3xl" />
                    <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-gradient-to-tl from-primary/30 via-teal-500/20 to-transparent rounded-full blur-3xl" />
                </div>

                {/* Floating particles */}
                <FloatingParticle delay={0} duration={6} size={100} className="top-10 left-10 bg-primary/30" />
                <FloatingParticle delay={1} duration={8} size={70} className="top-1/3 right-10 bg-emerald-500/25" />
                <FloatingParticle delay={2} duration={7} size={90} className="bottom-20 left-1/4 bg-teal-500/25" />
                <FloatingParticle delay={0.5} duration={9} size={50} className="bottom-1/3 right-1/4 bg-primary/20" />

                {/* Subtle grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:32px_32px] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)]" />
            </div>

            {/* Close Button */}
            <motion.button
                onClick={() => close()}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className={cn(
                    "absolute top-4 z-50 p-2.5 rounded-full",
                    "bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm",
                    "hover:bg-white dark:hover:bg-slate-700 hover:scale-110",
                    "shadow-lg shadow-black/5 transition-all duration-300",
                    isRTL ? "left-4" : "right-4"
                )}
            >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </motion.button>

            {/* Main Content */}
            <div className="relative z-10 w-full flex flex-col items-center px-8 pt-10 pb-6">
                {/* Animated Logo */}
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="relative mb-6"
                >
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary via-emerald-500 to-teal-500 rounded-3xl blur-2xl opacity-30 animate-pulse" />

                    {/* Icon container */}
                    <div className="relative w-20 h-20 bg-gradient-to-br from-primary to-emerald-600 rounded-3xl rotate-6 shadow-2xl shadow-primary/30 flex items-center justify-center">
                        <motion.div
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <Lock className="w-9 h-9 text-white drop-shadow-lg" />
                        </motion.div>
                    </div>

                    {/* Sparkle decorations */}
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -top-2 -right-2"
                    >
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                    </motion.div>
                </motion.div>

                {/* Title Section */}
                <div className="text-center w-full space-y-3 mb-8">
                    <motion.h2
                        key={view + "-title"}
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent"
                    >
                        {view === 'login'
                            ? (isRTL ? 'مرحباً بعودتك' : 'Welcome Back')
                            : (isRTL ? 'إنشاء حساب جديد' : 'Create Account')
                        }
                    </motion.h2>
                    <motion.p
                        key={view + "-subtitle"}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-muted-foreground text-base max-w-[85%] mx-auto"
                    >
                        {view === 'login'
                            ? (isRTL ? 'سجّل دخولك للمتابعة في التسوق' : 'Sign in to continue shopping')
                            : (isRTL ? 'انضم إلينا للحصول على أفضل العروض' : 'Join us for exclusive deals')
                        }
                    </motion.p>
                </div>

                {/* Forms Container */}
                <div className="w-full relative overflow-hidden">
                    <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                        {view === 'login' ? (
                            <motion.div
                                key="login"
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{
                                    x: { type: "spring", stiffness: 300, damping: 30 },
                                    opacity: { duration: 0.2 }
                                }}
                                className="w-full"
                            >
                                <Form {...loginForm}>
                                    <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-5">
                                        <FormField
                                            control={loginForm.control}
                                            name="phoneNumber"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-medium text-slate-600 dark:text-slate-300 ms-1">{t('phone_number')}</FormLabel>
                                                    <FormControl>
                                                        <PremiumInput
                                                            icon={Phone}
                                                            placeholder="01xxxxxxxxx"
                                                            {...field}
                                                            style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-xs ms-1" />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={loginForm.control}
                                            name="password"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-medium text-slate-600 dark:text-slate-300 ms-1">{t('password')}</FormLabel>
                                                    <FormControl>
                                                        <PremiumInput
                                                            icon={Lock}
                                                            type="password"
                                                            placeholder="••••••••"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-xs ms-1" />
                                                </FormItem>
                                            )}
                                        />

                                        <motion.div
                                            className="pt-3"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Button
                                                type="submit"
                                                className={cn(
                                                    "w-full h-14 rounded-2xl text-lg font-bold",
                                                    "bg-gradient-to-r from-primary to-emerald-600",
                                                    "hover:from-primary/90 hover:to-emerald-600/90",
                                                    "shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30",
                                                    "transition-all duration-300"
                                                )}
                                                disabled={loginMutation.isPending}
                                            >
                                                {loginMutation.isPending ? (
                                                    <Loader2 className="h-6 w-6 animate-spin" />
                                                ) : (
                                                    <span className="flex items-center gap-2">
                                                        {t('login')}
                                                        {isRTL ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                                                    </span>
                                                )}
                                            </Button>
                                        </motion.div>
                                    </form>
                                </Form>

                                {/* Security Badge */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="flex items-center justify-center gap-2 mt-6 text-xs text-muted-foreground"
                                >
                                    <Shield className="w-4 h-4 text-green-500" />
                                    <span>{isRTL ? 'تسجيل دخول آمن ومشفر' : 'Secure & Encrypted Login'}</span>
                                </motion.div>

                                {/* Switch to Register */}
                                <div className="mt-8 text-center">
                                    <div className="relative flex items-center justify-center mb-4">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                                        </div>
                                        <span className="relative bg-white dark:bg-slate-900 px-4 text-sm text-muted-foreground">
                                            {isRTL ? 'أو' : 'or'}
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground text-sm mb-3">{isRTL ? 'ليس لديك حساب؟' : "Don't have an account?"}</p>
                                    <Button
                                        variant="outline"
                                        className="w-full h-12 rounded-2xl font-semibold border-2 border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
                                        onClick={() => toggleView('register')}
                                    >
                                        {t('create_new_account')}
                                    </Button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="register"
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{
                                    x: { type: "spring", stiffness: 300, damping: 30 },
                                    opacity: { duration: 0.2 }
                                }}
                                className="w-full"
                            >
                                <Form {...registerForm}>
                                    <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <FormField
                                                control={registerForm.control}
                                                name="firstName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-sm font-medium text-slate-600 dark:text-slate-300 ms-1">{t('first_name')}</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                className="h-12 bg-white/50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary/50 transition-all duration-300 rounded-xl"
                                                            />
                                                        </FormControl>
                                                        <FormMessage className="text-xs" />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={registerForm.control}
                                                name="lastName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-sm font-medium text-slate-600 dark:text-slate-300 ms-1">{t('last_name')}</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                className="h-12 bg-white/50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary/50 transition-all duration-300 rounded-xl"
                                                            />
                                                        </FormControl>
                                                        <FormMessage className="text-xs" />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <FormField
                                            control={registerForm.control}
                                            name="phoneNumber"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-medium text-slate-600 dark:text-slate-300 ms-1">{t('phone_number')}</FormLabel>
                                                    <FormControl>
                                                        <PremiumInput
                                                            icon={Phone}
                                                            placeholder="01xxxxxxxxx"
                                                            {...field}
                                                            style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-xs ms-1" />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={registerForm.control}
                                            name="password"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-medium text-slate-600 dark:text-slate-300 ms-1">{t('password')}</FormLabel>
                                                    <FormControl>
                                                        <PremiumInput
                                                            icon={Lock}
                                                            type="password"
                                                            placeholder="••••••••"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-xs ms-1" />
                                                </FormItem>
                                            )}
                                        />

                                        <motion.div
                                            className="pt-2"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Button
                                                type="submit"
                                                className={cn(
                                                    "w-full h-14 rounded-2xl text-lg font-bold",
                                                    "bg-gradient-to-r from-primary to-emerald-600",
                                                    "hover:from-primary/90 hover:to-emerald-600/90",
                                                    "shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30",
                                                    "transition-all duration-300"
                                                )}
                                                disabled={registerMutation.isPending}
                                            >
                                                {registerMutation.isPending ? (
                                                    <Loader2 className="h-6 w-6 animate-spin" />
                                                ) : (
                                                    <span className="flex items-center gap-2">
                                                        {t('register')}
                                                        {isRTL ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                                                    </span>
                                                )}
                                            </Button>
                                        </motion.div>
                                    </form>
                                </Form>

                                {/* Security Badge */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="flex items-center justify-center gap-2 mt-5 text-xs text-muted-foreground"
                                >
                                    <Shield className="w-4 h-4 text-green-500" />
                                    <span>{isRTL ? 'بياناتك محمية ومشفرة' : 'Your data is protected'}</span>
                                </motion.div>

                                {/* Switch to Login */}
                                <div className="mt-6 text-center">
                                    <p className="text-muted-foreground text-sm mb-3">{isRTL ? 'لديك حساب بالفعل؟' : "Already have an account?"}</p>
                                    <Button
                                        variant="outline"
                                        className="w-full h-12 rounded-2xl font-semibold border-2 border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
                                        onClick={() => toggleView('login')}
                                    >
                                        {t('login')}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={(open) => !open && close()}>
                <DrawerContent className="p-0 rounded-t-[2rem] max-h-[95vh] border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
                    <DrawerTitle className="sr-only">Authentication</DrawerTitle>
                    <div className="overflow-y-auto">
                        <Content />
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
            <DialogContent
                className={cn(
                    "sm:max-w-[480px] overflow-hidden p-0 gap-0",
                    "rounded-[2rem] border-0",
                    "shadow-2xl shadow-black/20",
                    "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl"
                )}
                dir={isRTL ? "rtl" : "ltr"}
            >
                <DialogTitle className="sr-only">Authentication</DialogTitle>
                <Content />
            </DialogContent>
        </Dialog>
    );
}
