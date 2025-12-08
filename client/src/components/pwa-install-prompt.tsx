import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useTranslation } from "react-i18next";

export function PWAInstallPrompt() {
  const { isInstallable, install } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroidDevice = /android/.test(userAgent);
    setIsAndroid(isAndroidDevice);
  }, []);

  useEffect(() => {
    // Check if running as installed PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    // Show prompt if installable and not already installed
    // On Android, always show if installable (as per user request)
    if (isInstallable && !isStandalone) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isAndroid]);

  if (!showPrompt || !isInstallable) {
    return null;
  }

  return (
    <div
      className="fixed bottom-20 left-4 right-4 sm:right-auto sm:w-96 sm:bottom-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-4 z-50 animate-in slide-in-from-bottom-4"
      data-testid="pwa-install-prompt"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="flex gap-3">
        <div className="p-2 bg-primary/10 rounded-xl shrink-0">
          <Download className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-sm mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isRTL ? 'حمّل التطبيق' : 'Install App'}
          </h3>
          <p className={`text-xs text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
            {isRTL
              ? 'حمّل التطبيق على جهازك للوصول السريع'
              : 'Install on your device for quick access'}
          </p>
        </div>
        <button
          onClick={() => setShowPrompt(false)}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Close"
          data-testid="button-close-prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className={`flex gap-2 mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPrompt(false)}
          className="flex-1"
          data-testid="button-maybe-later"
        >
          {isRTL ? 'لاحقاً' : 'Maybe Later'}
        </Button>
        <Button
          size="sm"
          onClick={() => {
            install();
            setShowPrompt(false);
          }}
          className="flex-1 flex items-center justify-center gap-2"
          data-testid="button-install"
        >
          <Download className="w-4 h-4" />
          {isRTL ? 'تثبيت' : 'Install'}
        </Button>
      </div>
    </div>
  );
}
