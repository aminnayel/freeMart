import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Bell, X, Gift, Package } from "lucide-react";
import { subscribeToPushNotifications, checkPushSubscription } from "@/lib/push-notifications";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Session storage key - dismissal only lasts for this browser session
const SESSION_DISMISSED_KEY = "notification_prompt_dismissed_session";

export function NotificationPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const { i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const isMobile = useIsMobile();

    const checkAndShowPrompt = useCallback(() => {
        if (!("Notification" in window)) return;

        const currentPermission = Notification.permission;
        setPermission(currentPermission);

        // Only show prompt if permission is default AND not dismissed this session
        if (currentPermission === "default") {
            const isDismissedThisSession = sessionStorage.getItem(SESSION_DISMISSED_KEY) === "true";
            if (!isDismissedThisSession) {
                setShowPrompt(true);
            }
        }
    }, []);

    useEffect(() => {
        // Check if browser supports notifications
        if (!("Notification" in window)) return;

        const currentPermission = Notification.permission;
        setPermission(currentPermission);

        // If already granted, verify we actually have a push subscription
        if (currentPermission === "granted") {
            // Check if we actually have a subscription, if not show prompt to re-subscribe
            checkPushSubscription().then((hasSubscription) => {
                if (hasSubscription) {
                    // Silently re-subscribe to ensure server has our subscription
                    subscribeToPushNotifications().catch(console.error);
                } else {
                    // Permission granted but no subscription - need to re-subscribe
                    console.log("Permission granted but no subscription found, prompting user");
                    const isDismissedThisSession = sessionStorage.getItem(SESSION_DISMISSED_KEY) === "true";
                    if (!isDismissedThisSession) {
                        const delay = isMobile ? 1000 : 2000;
                        setTimeout(() => setShowPrompt(true), delay);
                    }
                }
            });
            return;
        }

        // Show prompt after a delay if permission is default
        if (currentPermission === "default") {
            const isDismissedThisSession = sessionStorage.getItem(SESSION_DISMISSED_KEY) === "true";
            if (!isDismissedThisSession) {
                // Shorter delay on mobile to ensure visibility (PWA requirement)
                const delay = isMobile ? 1500 : 3000;
                const timer = setTimeout(() => setShowPrompt(true), delay);
                return () => clearTimeout(timer);
            }
        }
    }, [isMobile]);

    // Listen for custom event to re-show prompt (e.g., after adding to cart)
    useEffect(() => {
        const handleShowPrompt = () => {
            if (Notification.permission === "default") {
                sessionStorage.removeItem(SESSION_DISMISSED_KEY);
                setShowPrompt(true);
            }
        };

        window.addEventListener("show-notification-prompt", handleShowPrompt);
        return () => window.removeEventListener("show-notification-prompt", handleShowPrompt);
    }, []);

    const handleEnable = async () => {
        if (!("Notification" in window)) return;

        try {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === "granted") {
                await subscribeToPushNotifications();
            }
            setShowPrompt(false);
            sessionStorage.removeItem(SESSION_DISMISSED_KEY);
        } catch (error) {
            console.error("Error requesting notification permission:", error);
        }
    };

    const handleClose = () => {
        // Only dismiss for this session
        sessionStorage.setItem(SESSION_DISMISSED_KEY, "true");
        setShowPrompt(false);
    };

    if (!showPrompt || permission === "granted" || permission === "denied") {
        return null;
    }

    return (
        <div
            className={cn(
                "fixed z-50 animate-in",
                isMobile
                    ? "bottom-20 left-3 right-3 slide-in-from-bottom-4"
                    : "bottom-6 right-6 w-[380px] slide-in-from-right-4"
            )}
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            <div className="bg-gradient-to-br from-primary/5 to-background border-2 border-primary/20 shadow-2xl shadow-primary/10 rounded-2xl p-5 backdrop-blur-xl">
                {/* Top Bar with Icon and Close */}
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-primary to-primary/80 text-white rounded-xl shrink-0 shadow-lg shadow-primary/30">
                        <Bell className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-lg leading-tight">
                                {isRTL ? 'فعّل الإشعارات' : 'Stay Updated!'}
                            </h4>
                            <button
                                onClick={handleClose}
                                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            {isRTL
                                ? 'فعّل الإشعارات عشان يوصلك تنبيه لما المنتجات تتوفر!'
                                : 'Get notified when products are back in stock!'}
                        </p>
                    </div>
                </div>

                {/* Benefits */}
                <div className="flex gap-3 mt-4 mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-full">
                        <Package className="w-3.5 h-3.5 text-primary" />
                        <span>{isRTL ? 'توفر المنتجات' : 'Stock Alerts'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-full">
                        <Gift className="w-3.5 h-3.5 text-primary" />
                        <span>{isRTL ? 'عروض حصرية' : 'Exclusive Deals'}</span>
                    </div>
                </div>

                {/* Action Button */}
                <Button
                    onClick={handleEnable}
                    className="w-full font-bold rounded-xl h-11 text-base shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                >
                    <Bell className="w-4 h-4 me-2" />
                    {isRTL ? 'تفعيل الإشعارات' : 'Enable Notifications'}
                </Button>

                {/* Subtle dismiss text */}
                <p className="text-xs text-center text-muted-foreground/60 mt-3">
                    {isRTL ? 'يمكنك تغيير هذا لاحقاً من الإعدادات' : 'You can change this later in settings'}
                </p>
            </div>
        </div>
    );
}

