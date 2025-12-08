import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
    quantity: number;
    onIncrement: () => void;
    onDecrement: () => void;
    onRemove?: () => void;
    min?: number;
    max?: number;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'filled' | 'outline';
    disabled?: boolean;
    showRemoveOnOne?: boolean;
}

export function QuantitySelector({
    quantity,
    onIncrement,
    onDecrement,
    onRemove,
    min = 0,
    max = 99,
    size = 'md',
    variant = 'default',
    disabled = false,
    showRemoveOnOne = true,
}: QuantitySelectorProps) {
    const sizeClasses = {
        sm: {
            container: "h-8 gap-1 px-1",
            button: "h-6 w-6",
            icon: "w-3 h-3",
            text: "text-sm w-6",
        },
        md: {
            container: "h-10 gap-2 px-1.5",
            button: "h-7 w-7",
            icon: "w-4 h-4",
            text: "text-base w-8",
        },
        lg: {
            container: "h-12 gap-3 px-2",
            button: "h-9 w-9",
            icon: "w-5 h-5",
            text: "text-lg w-10",
        },
    };

    const variantClasses = {
        default: "bg-primary/10 dark:bg-primary/20",
        filled: "bg-primary text-primary-foreground",
        outline: "border-2 border-primary bg-transparent",
    };

    const buttonVariantClasses = {
        default: "hover:bg-white dark:hover:bg-slate-800 text-primary",
        filled: "hover:bg-primary-foreground/20 text-primary-foreground",
        outline: "hover:bg-primary/10 text-primary",
    };

    const handleDecrement = () => {
        if (quantity <= min) return;
        if (quantity === 1 && showRemoveOnOne && onRemove) {
            onRemove();
        } else {
            onDecrement();
        }
    };

    const handleIncrement = () => {
        if (quantity >= max) return;
        onIncrement();
    };

    const showTrashIcon = showRemoveOnOne && quantity === 1 && onRemove;

    return (
        <div
            className={cn(
                "inline-flex items-center justify-between rounded-xl transition-all",
                sizeClasses[size].container,
                variantClasses[variant],
                disabled && "opacity-50 pointer-events-none"
            )}
        >
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "rounded-lg shadow-sm transition-all duration-200",
                    sizeClasses[size].button,
                    buttonVariantClasses[variant],
                    quantity <= min && "opacity-50 cursor-not-allowed"
                )}
                onClick={handleDecrement}
                disabled={disabled || quantity <= min}
            >
                {showTrashIcon ? (
                    <Trash2 className={cn(sizeClasses[size].icon, "text-destructive")} />
                ) : (
                    <Minus className={sizeClasses[size].icon} />
                )}
            </Button>

            <span
                className={cn(
                    "font-bold text-center select-none transition-all duration-200",
                    sizeClasses[size].text,
                    variant === 'filled' ? "text-primary-foreground" : "text-primary"
                )}
            >
                {quantity}
            </span>

            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "rounded-lg shadow-sm transition-all duration-200",
                    sizeClasses[size].button,
                    buttonVariantClasses[variant],
                    quantity >= max && "opacity-50 cursor-not-allowed"
                )}
                onClick={handleIncrement}
                disabled={disabled || quantity >= max}
            >
                <Plus className={sizeClasses[size].icon} />
            </Button>
        </div>
    );
}

export default QuantitySelector;
