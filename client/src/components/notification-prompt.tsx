import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { subscribeToPushNotifications } from "@/lib/push-notifications";

export function NotificationPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>("default");

    useEffect(() => {
        // Check if browser supports notifications
        if (!("Notification" in window)) return;

        setPermission(Notification.permission);

        // Show prompt if permission is default (not granted or denied yet)
        // and if standard PWA check (standalone) or just generally on mobile
        const isMobile = /mobile|tablet|android|iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

        // The user requested: "specifically for PWA" but also "always prompt if not enabled"
        // We should prompt if we are in PWA mode OR if it's mobile web (likely PWA usage context)
        if (Notification.permission === "default" && (isStandalone || isMobile)) {
            // Delay slightly
            const timer = setTimeout(() => setShowPrompt(true), 3000);
            return () => clearTimeout(timer);
        }
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
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 md:right-auto md:w-96 md:bottom-4">
            <div className="bg-popover text-popover-foreground border shadow-xl rounded-xl p-4 flex gap-4 items-start">
                <div className="p-2 bg-primary/10 text-primary rounded-full">
                    <Bell className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                        <h4 className="font-semibold leading-none tracking-tight">تفعيل الإشعارات</h4>
                        <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        فعّل الإشعارات عشان يوصلك تنبيه لما المنتجات تتوفر وعروضنا الجديدة!
                    </p>
                    <Button onClick={handleEnable} className="w-full mt-3 font-bold" size="sm">
                        تفعيل التنبيهات
                    </Button>
                </div>
            </div>
        </div>
    );
}
