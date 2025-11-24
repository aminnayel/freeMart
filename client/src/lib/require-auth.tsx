import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export function RequireAuth({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const [, setLocation] = useLocation();

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
        setLocation("/auth");
        return null;
    }

    return <>{children}</>;
}
