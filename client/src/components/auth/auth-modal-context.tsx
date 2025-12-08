import { createContext, useContext, useState, ReactNode } from 'react';

type AuthView = 'login' | 'register';

interface AuthModalContextType {
    isOpen: boolean;
    view: AuthView;
    redirectPath: string | null;
    openLogin: (redirect?: string) => void;
    openRegister: (redirect?: string) => void;
    close: () => void;
    toggleView: (view: AuthView) => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<AuthView>('login');
    const [redirectPath, setRedirectPath] = useState<string | null>(null);

    const openLogin = (redirect?: string) => {
        if (redirect) setRedirectPath(redirect);
        setView('login');
        setIsOpen(true);
    };

    const openRegister = (redirect?: string) => {
        if (redirect) setRedirectPath(redirect);
        setView('register');
        setIsOpen(true);
    };

    const close = () => {
        setIsOpen(false);
        setRedirectPath(null);
    };

    const toggleView = (newView: AuthView) => {
        setView(newView);
    };

    return (
        <AuthModalContext.Provider value={{
            isOpen,
            view,
            redirectPath,
            openLogin,
            openRegister,
            close,
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
