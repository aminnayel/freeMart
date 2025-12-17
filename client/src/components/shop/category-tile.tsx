import { memo } from "react";
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
    // Get display name based on language
    const getDisplayName = () => {
        if (!isRTL) {
            if (category.englishName) {
                return category.englishName;
            }
            return translateContent(category.name, 'en');
        }
        return category.name;
    };

    const sizeConfig = {
        sm: {
            container: "min-w-[72px] p-2",
            icon: "w-12 h-12 text-2xl",
            text: "text-[10px]",
        },
        md: {
            container: "min-w-[88px] p-2.5",
            icon: "w-14 h-14 text-3xl",
            text: "text-xs",
        },
        lg: {
            container: "min-w-[100px] p-3",
            icon: "w-16 h-16 text-4xl",
            text: "text-sm",
        },
    };

    const config = sizeConfig[size];

    return (
        <button
            onClick={onClick}
            className={cn(
                "group flex flex-col items-center gap-2 rounded-2xl snap-start box-border",
                "transition-colors transition-shadow transition-transform duration-200",
                "hover:scale-[1.02] active:scale-[0.98]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                config.container,
                isActive
                    ? "bg-gradient-to-br from-primary/15 to-primary/5 shadow-lg shadow-primary/10 outline outline-2 outline-primary/30"
                    : "bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:bg-gradient-to-br hover:from-primary/5 hover:to-transparent outline outline-0 outline-transparent"
            )}
        >
            {/* Icon Container */}
            <div
                className={cn(
                    "flex items-center justify-center rounded-xl overflow-hidden transition-all duration-300",
                    "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900",
                    "group-hover:scale-105",
                    config.icon,
                    isActive && "from-primary/10 to-primary/5 ring-1 ring-primary/20"
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
                    <span className="select-none transition-transform duration-300 group-hover:scale-110">
                        {category.imageUrl || "📦"}
                    </span>
                )}
            </div>

            {/* Category Name */}
            <span
                className={cn(
                    "font-semibold text-center leading-tight max-w-full truncate px-0.5 transition-colors duration-200",
                    config.text,
                    isActive
                        ? "text-primary"
                        : "text-foreground/70 group-hover:text-foreground"
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

export const CategoryRow = memo(function CategoryRow({
    categories,
    activeId,
    onSelect,
    isRTL = false,
    size = 'md',
}: CategoryRowProps & { size?: 'sm' | 'md' | 'lg' }) {
    return (
        <div className="relative" dir={isRTL ? "rtl" : "ltr"}>
            <div
                className={cn(
                    "flex gap-2 overflow-x-auto pb-2 px-4 -mx-4 scrollbar-none snap-x snap-mandatory"
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
                    size={size}
                    isRTL={isRTL}
                />

                {categories.map((category) => (
                    <CategoryTile
                        key={category.id}
                        category={category}
                        isActive={activeId === category.id}
                        onClick={() => onSelect(category.id)}
                        size={size}
                        isRTL={isRTL}
                    />
                ))}
            </div>

            {/* Fade edges for scroll indication */}
            <div className={cn(
                "absolute top-0 bottom-2 w-6 pointer-events-none",
                "bg-gradient-to-r from-background to-transparent",
                isRTL ? "right-0 bg-gradient-to-l" : "left-0"
            )} />
            <div className={cn(
                "absolute top-0 bottom-2 w-6 pointer-events-none",
                "bg-gradient-to-l from-background to-transparent",
                isRTL ? "left-0 bg-gradient-to-r" : "right-0"
            )} />
        </div>
    );
});

export default CategoryTile;
