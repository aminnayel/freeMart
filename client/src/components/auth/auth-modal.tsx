import { useState, useEffect } from "react";
import { useAuthModal } from "./auth-modal-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Loader2, Phone, Lock, User, Eye, EyeOff, X, CheckCircle2, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
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

export function AuthModal() {
    const { isOpen, view, close, closeWithHistory, toggleView, redirectPath, previousPath } = useAuthModal();
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const isMobile = useIsMobile();
    const [showPassword, setShowPassword] = useState(false);

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
            setShowPassword(false);
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

    // Styled Input Component
    const StyledInput = ({
        icon: Icon,
        showPasswordToggle = false,
        ...props
    }: any) => (
        <div className="relative group">
            <div className={cn(
                "absolute top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center transition-colors",
                isRTL ? "right-0" : "left-0"
            )}>
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-focus-within:bg-primary/20 transition-colors">
                    <Icon className="h-4 w-4 text-primary" />
                </div>
            </div>
            <Input
                {...props}
                type={showPasswordToggle ? (showPassword ? "text" : "password") : props.type}
                className={cn(
                    "h-12 bg-muted/50 border-0 ring-1 ring-border/50",
                    "focus:ring-2 focus:ring-primary/50 focus:bg-background",
                    "transition-all duration-200 rounded-xl text-base",
                    "placeholder:text-muted-foreground/60",
                    isRTL ? "pr-12 text-right" : "pl-12",
                    showPasswordToggle && (isRTL ? "pl-12" : "pr-12"),
                    props.className
                )}
            />
            {showPasswordToggle && (
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={cn(
                        "absolute top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors",
                        isRTL ? "left-1" : "right-1"
                    )}
                >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            )}
        </div>
    );

    // Benefits list for registration
    const benefits = [
        { icon: "🛒", text: isRTL ? "تتبع طلباتك" : "Track your orders" },
        { icon: "💝", text: isRTL ? "احفظ المفضلة" : "Save favorites" },
        { icon: "🎁", text: isRTL ? "عروض حصرية" : "Exclusive deals" },
    ];

    const Content = () => (
        <div className="flex flex-col" dir={isRTL ? "rtl" : "ltr"}>
            {/* Header with gradient accent */}
            <div className="relative overflow-hidden">
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />

                {/* Close Button */}
                <button
                    onClick={() => previousPath ? closeWithHistory() : close()}
                    className={cn(
                        "absolute top-4 z-50 p-2 rounded-full",
                        "bg-background/80 backdrop-blur-sm hover:bg-background",
                        "shadow-sm transition-all duration-200 hover:scale-105",
                        isRTL ? "left-4" : "right-4"
                    )}
                >
                    <X className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Logo and Title */}
                <div className="relative pt-8 pb-6 px-6 text-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25 mb-4"
                    >
                        <ShoppingBag className="w-8 h-8 text-white" />
                    </motion.div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={view}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <h2 className="text-2xl font-bold text-foreground mb-1">
                                {view === 'login'
                                    ? (isRTL ? 'تسجيل الدخول' : 'Sign In')
                                    : (isRTL ? 'إنشاء حساب' : 'Create Account')
                                }
                            </h2>
                            <p className="text-muted-foreground text-sm">
                                {view === 'login'
                                    ? (isRTL ? 'مرحباً بعودتك! أدخل بياناتك للمتابعة' : 'Welcome back! Enter your details')
                                    : (isRTL ? 'انضم إلينا في دقائق' : 'Join us in minutes')
                                }
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Forms */}
            <div className="px-6 pb-6">
                <AnimatePresence mode="wait">
                    {view === 'login' ? (
                        <motion.div
                            key="login"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Form {...loginForm}>
                                <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                                    <FormField
                                        control={loginForm.control}
                                        name="phoneNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <StyledInput
                                                        icon={Phone}
                                                        placeholder={isRTL ? "رقم الهاتف" : "Phone number"}
                                                        {...field}
                                                        style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xs px-1" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={loginForm.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <StyledInput
                                                        icon={Lock}
                                                        showPasswordToggle
                                                        placeholder={isRTL ? "كلمة المرور" : "Password"}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xs px-1" />
                                            </FormItem>
                                        )}
                                    />

                                    <Button
                                        type="submit"
                                        className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                                        disabled={loginMutation.isPending}
                                    >
                                        {loginMutation.isPending ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            isRTL ? 'تسجيل الدخول' : 'Sign In'
                                        )}
                                    </Button>
                                </form>
                            </Form>

                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-border/50" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-3 text-muted-foreground">
                                        {isRTL ? 'أو' : 'or'}
                                    </span>
                                </div>
                            </div>

                            {/* Switch to Register */}
                            <div className="text-center">
                                <p className="text-muted-foreground text-sm mb-3">
                                    {isRTL ? 'ليس لديك حساب؟' : "Don't have an account?"}
                                </p>
                                <Button
                                    variant="outline"
                                    className="w-full h-11 rounded-xl font-medium border-2 hover:bg-primary/5 hover:border-primary/30 transition-all"
                                    onClick={() => toggleView('register')}
                                >
                                    {isRTL ? 'إنشاء حساب جديد' : 'Create New Account'}
                                </Button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="register"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Benefits */}
                            <div className="flex justify-center gap-4 mb-5">
                                {benefits.map((b, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <span>{b.icon}</span>
                                        <span>{b.text}</span>
                                    </div>
                                ))}
                            </div>

                            <Form {...registerForm}>
                                <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <FormField
                                            control={registerForm.control}
                                            name="firstName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <div className="relative group">
                                                            <div className={cn(
                                                                "absolute top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center",
                                                                isRTL ? "right-0" : "left-0"
                                                            )}>
                                                                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-focus-within:bg-primary/20 transition-colors">
                                                                    <User className="h-4 w-4 text-primary" />
                                                                </div>
                                                            </div>
                                                            <Input
                                                                {...field}
                                                                placeholder={isRTL ? "الاسم الأول" : "First name"}
                                                                className={cn(
                                                                    "h-12 bg-muted/50 border-0 ring-1 ring-border/50",
                                                                    "focus:ring-2 focus:ring-primary/50 focus:bg-background",
                                                                    "transition-all duration-200 rounded-xl",
                                                                    "placeholder:text-muted-foreground/60",
                                                                    isRTL ? "pr-12 text-right" : "pl-12"
                                                                )}
                                                            />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage className="text-xs px-1" />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={registerForm.control}
                                            name="lastName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            placeholder={isRTL ? "الاسم الأخير" : "Last name"}
                                                            className={cn(
                                                                "h-12 bg-muted/50 border-0 ring-1 ring-border/50",
                                                                "focus:ring-2 focus:ring-primary/50 focus:bg-background",
                                                                "transition-all duration-200 rounded-xl",
                                                                "placeholder:text-muted-foreground/60",
                                                                isRTL && "text-right"
                                                            )}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-xs px-1" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={registerForm.control}
                                        name="phoneNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <StyledInput
                                                        icon={Phone}
                                                        placeholder={isRTL ? "رقم الهاتف" : "Phone number"}
                                                        {...field}
                                                        style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xs px-1" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={registerForm.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <StyledInput
                                                        icon={Lock}
                                                        showPasswordToggle
                                                        placeholder={isRTL ? "كلمة المرور (6 أحرف على الأقل)" : "Password (min 6 characters)"}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xs px-1" />
                                            </FormItem>
                                        )}
                                    />

                                    <Button
                                        type="submit"
                                        className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all mt-2"
                                        disabled={registerMutation.isPending}
                                    >
                                        {registerMutation.isPending ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4" />
                                                {isRTL ? 'إنشاء الحساب' : 'Create Account'}
                                            </span>
                                        )}
                                    </Button>
                                </form>
                            </Form>

                            {/* Switch to Login */}
                            <div className="mt-5 text-center">
                                <p className="text-muted-foreground text-sm">
                                    {isRTL ? 'لديك حساب بالفعل؟' : "Already have an account?"}{' '}
                                    <button
                                        onClick={() => toggleView('login')}
                                        className="text-primary font-semibold hover:underline"
                                    >
                                        {isRTL ? 'سجّل دخول' : 'Sign In'}
                                    </button>
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={(open) => !open && close()}>
                <DrawerContent className="p-0 rounded-t-[1.5rem] border-0 bg-background">
                    <DrawerTitle className="sr-only">Authentication</DrawerTitle>
                    <div className="overflow-y-auto max-h-[90vh]">
                        <Content />
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && (previousPath ? closeWithHistory() : close())}>
            <DialogContent
                className={cn(
                    "sm:max-w-[420px] overflow-hidden p-0 gap-0",
                    "rounded-2xl border shadow-2xl",
                    "bg-background",
                    "[&>button[data-radix-dialog-close]]:hidden"
                )}
                dir={isRTL ? "rtl" : "ltr"}
            >
                <DialogTitle className="sr-only">Authentication</DialogTitle>
                <Content />
            </DialogContent>
        </Dialog>
    );
}
