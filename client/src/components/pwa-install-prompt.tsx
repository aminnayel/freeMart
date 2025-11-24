import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function PWAInstallPrompt() {
  const { isInstallable, install } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /mobile|tablet|android|iphone|ipad|ipod/.test(userAgent);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isInstallable && isMobile) {
      // Delay showing prompt slightly to not be intrusive on first load
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isMobile]);

  if (!showPrompt || !isInstallable || !isMobile) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:right-auto sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-50 animate-in slide-in-from-bottom-4"
      data-testid="pwa-install-prompt"
    >
      <div className="flex gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Install FreshMart</h3>
          <p className="text-xs text-muted-foreground">
            Get FreshMart on your home screen for quick access
          </p>
        </div>
        <button
          onClick={() => setShowPrompt(false)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close"
          data-testid="button-close-prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPrompt(false)}
          data-testid="button-maybe-later"
        >
          Maybe Later
        </Button>
        <Button
          size="sm"
          onClick={() => {
            install();
            setShowPrompt(false);
          }}
          className="flex items-center gap-2"
          data-testid="button-install"
        >
          <Download className="w-4 h-4" />
          Install
        </Button>
      </div>
    </div>
  );
}
