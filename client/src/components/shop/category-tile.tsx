import { cn } from "@/lib/utils";
import { translateContent } from "@/lib/translator";

interface CategoryTileProps {
    category: {
        id: number;
        name: string;
        englishName?: string | null;
        slug: string;
        imageUrl?: string | null;
    };
    isActive?: boolean;
    onClick: () => void;
    size?: 'sm' | 'md' | 'lg';
    isRTL?: boolean;
}

export function CategoryTile({
    category,
    isActive = false,
    onClick,
    size = 'md',
    isRTL = false,
}: CategoryTileProps) {
    const sizeClasses = {
        sm: "w-16 h-16",
        md: "w-20 h-20",
        lg: "w-24 h-24",
    };

    const iconSizes = {
        sm: "text-2xl",
        md: "text-3xl",
        lg: "text-4xl",
    };

    const textSizes = {
        sm: "text-[10px]",
        md: "text-xs",
        lg: "text-sm",
    };

    // Get display name based on language
    const getDisplayName = () => {
        if (!isRTL) {
            // English mode - use englishName first, then translate Arabic name
            if (category.englishName) {
                return category.englishName;
            }
            return translateContent(category.name, 'en');
        }
        // Arabic mode - use the original name
        return category.name;
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl p-2 transition-all duration-300",
                "hover:scale-105 active:scale-95",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isActive
                    ? "bg-primary/10 border-2 border-primary shadow-sm"
                    : "bg-white dark:bg-slate-900 border-2 border-transparent hover:border-primary/20 hover:shadow-md"
            )}
        >
            {/* Icon/Image Container */}
            <div
                className={cn(
                    "flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 overflow-hidden transition-transform duration-300",
                    sizeClasses[size],
                    isActive && "from-primary/5 to-primary/10"
                )}
            >
                {(category.imageUrl?.startsWith('http') || category.imageUrl?.startsWith('/')) ? (
                    <img
                        src={category.imageUrl}
                        alt={getDisplayName()}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <span className={cn("select-none", iconSizes[size])}>
                        {category.imageUrl || "📦"}
                    </span>
                )}
            </div>

            {/* Category Name */}
            <span
                className={cn(
                    "font-medium text-center leading-tight max-w-full truncate px-1",
                    textSizes[size],
                    isActive ? "text-primary" : "text-foreground/80"
                )}
            >
                {getDisplayName()}
            </span>
        </button>
    );
}

// Compact horizontal scrolling category row
interface CategoryRowProps {
    categories: Array<{
        id: number;
        name: string;
        englishName?: string | null;
        slug: string;
        imageUrl?: string | null;
    }>;
    activeId?: number | null;
    onSelect: (id: number | null) => void;
    isRTL?: boolean;
}

export function CategoryRow({
    categories,
    activeId,
    onSelect,
    isRTL = false,
}: CategoryRowProps) {
    return (
        <div className="relative">
            <div
                className={cn(
                    "flex gap-3 overflow-x-auto pb-2 px-4 -mx-4 scrollbar-none snap-x snap-mandatory",
                    isRTL && "flex-row-reverse"
                )}
            >
                {/* All Categories Button */}
                <CategoryTile
                    category={{
                        id: 0,
                        name: isRTL ? "الكل" : "All",
                        slug: "all",
                        imageUrl: "🏪",
                    }}
                    isActive={activeId === null}
                    onClick={() => onSelect(null)}
                    size="md"
                    isRTL={isRTL}
                />

                {categories.map((category) => (
                    <CategoryTile
                        key={category.id}
                        category={category}
                        isActive={activeId === category.id}
                        onClick={() => onSelect(category.id)}
                        size="md"
                        isRTL={isRTL}
                    />
                ))}
            </div>

            {/* Fade edges for scroll indication */}
            <div className={cn(
                "absolute top-0 bottom-2 w-8 pointer-events-none",
                "bg-gradient-to-r from-background to-transparent",
                isRTL ? "right-0 bg-gradient-to-l" : "left-0"
            )} />
            <div className={cn(
                "absolute top-0 bottom-2 w-8 pointer-events-none",
                "bg-gradient-to-l from-background to-transparent",
                isRTL ? "left-0 bg-gradient-to-r" : "right-0"
            )} />
        </div>
    );
}

export default CategoryTile;
