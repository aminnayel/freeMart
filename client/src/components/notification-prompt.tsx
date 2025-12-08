import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { subscribeToPushNotifications } from "@/lib/push-notifications";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";

export function NotificationPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const { i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const isMobile = useIsMobile();

    useEffect(() => {
        // Check if browser supports notifications
        if (!("Notification" in window)) return;

        const currentPermission = Notification.permission;
        setPermission(currentPermission);

        // Always show prompt if permission is default (not granted or denied yet)
        if (currentPermission === "default") {
            // Shorter delay on mobile to ensure visibility (PWA requirement)
            const delay = isMobile ? 1000 : 3500;
            const timer = setTimeout(() => setShowPrompt(true), delay);
            return () => clearTimeout(timer);
        }
    }, [isMobile]);

    const handleEnable = async () => {
        if (!("Notification" in window)) return;

        try {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === "granted") {
                await subscribeToPushNotifications();
            }
            setShowPrompt(false);
        } catch (error) {
            console.error("Error requesting notification permission:", error);
        }
    };

    const handleClose = () => {
        setShowPrompt(false);
    };

    if (!showPrompt || permission === "granted" || permission === "denied") {
        return null;
    }

    return (
        <div
            className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 md:right-auto md:w-96 md:bottom-4"
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            <div className="bg-popover text-popover-foreground border shadow-xl rounded-2xl p-4 flex gap-4 items-start">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                    <Bell className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                        <h4 className={`font-bold leading-tight ${isRTL ? 'text-right' : 'text-left'}`}>
                            {isRTL ? 'تفعيل الإشعارات' : 'Enable Notifications'}
                        </h4>
                        <button
                            onClick={handleClose}
                            className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                        {isRTL
                            ? 'فعّل الإشعارات عشان يوصلك تنبيه لما المنتجات تتوفر وعروضنا الجديدة!'
                            : 'Get notified when products are back in stock and about new offers!'}
                    </p>
                    <Button onClick={handleEnable} className="w-full mt-3 font-bold rounded-xl" size="sm">
                        {isRTL ? 'تفعيل التنبيهات' : 'Enable Notifications'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
