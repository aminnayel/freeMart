import { createContext, useContext, useState, ReactNode } from 'react';

type AuthView = 'login' | 'register';

interface AuthModalContextType {
    isOpen: boolean;
    view: AuthView;
    redirectPath: string | null;
    previousPath: string | null;
    openLogin: (redirect?: string) => void;
    openRegister: (redirect?: string) => void;
    close: () => void;
    closeWithHistory: () => void;
    toggleView: (view: AuthView) => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<AuthView>('login');
    const [redirectPath, setRedirectPath] = useState<string | null>(null);
    const [previousPath, setPreviousPath] = useState<string | null>(null);

    const openLogin = (redirect?: string) => {
        if (redirect) {
            setRedirectPath(redirect);
            // Store where user came from before the protected route redirected them
            setPreviousPath(window.location.pathname);
        }
        setView('login');
        setIsOpen(true);
    };

    const openRegister = (redirect?: string) => {
        if (redirect) {
            setRedirectPath(redirect);
            setPreviousPath(window.location.pathname);
        }
        setView('register');
        setIsOpen(true);
    };

    const close = () => {
        setIsOpen(false);
        setRedirectPath(null);
        setPreviousPath(null);
    };

    // Close and navigate to home page (for protected pages where user dismisses login)
    const closeWithHistory = () => {
        setIsOpen(false);
        setRedirectPath(null);
        setPreviousPath(null);
        // Navigate to home page instead of going back (more reliable)
        window.location.href = '/';
    };

    const toggleView = (newView: AuthView) => {
        setView(newView);
    };

    return (
        <AuthModalContext.Provider value={{
            isOpen,
            view,
            redirectPath,
            previousPath,
            openLogin,
            openRegister,
            close,
            closeWithHistory,
            toggleView
        }}>
            {children}
        </AuthModalContext.Provider>
    );
}

export function useAuthModal() {
    const context = useContext(AuthModalContext);
    if (context === undefined) {
        throw new Error('useAuthModal must be used within a AuthModalProvider');
    }
    return context;
}
