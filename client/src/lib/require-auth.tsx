import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useEffect } from "react";

export function RequireAuth({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const [location] = useLocation();

    const { openLogin } = useAuthModal();

    useEffect(() => {
        if (!isLoading && !user) {
            openLogin(location);
        }
    }, [isLoading, user, location, openLogin]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
                {/* Optional: Show a blurred preview or nice placeholder */}
            </div>
        );
    }

    return <>{children}</>;
}
