import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Banner {
    id: number;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    backgroundColor?: string;
    textColor?: string;
    ctaText?: string;
    ctaLink?: string;
}

interface HeroBannerProps {
    banners: Banner[];
    autoPlayInterval?: number;
    isRTL?: boolean;
    onBannerClick?: (banner: Banner) => void;
}

export function HeroBanner({
    banners,
    autoPlayInterval = 5000,
    isRTL = false,
    onBannerClick,
}: HeroBannerProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // Auto-play
    useEffect(() => {
        if (isPaused || banners.length <= 1) return;

        const timer = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % banners.length);
        }, autoPlayInterval);

        return () => clearInterval(timer);
    }, [isPaused, banners.length, autoPlayInterval]);

    const goToSlide = (index: number) => {
        setActiveIndex(index);
    };

    const goToPrev = () => {
        setActiveIndex((prev) => (prev - 1 + banners.length) % banners.length);
    };

    const goToNext = () => {
        setActiveIndex((prev) => (prev + 1) % banners.length);
    };

    if (banners.length === 0) return null;

    const currentBanner = banners[activeIndex];

    return (
        <div
            className="relative overflow-hidden rounded-2xl"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Banner Container */}
            <div
                className={cn(
                    "relative h-40 sm:h-48 md:h-56 lg:h-64 cursor-pointer transition-all duration-500",
                    "bg-gradient-to-r from-primary to-primary/80"
                )}
                style={{
                    background: currentBanner.backgroundColor || undefined,
                }}
                onClick={() => onBannerClick?.(currentBanner)}
            >
                {/* Background Image */}
                {currentBanner.imageUrl && (
                    <img
                        src={currentBanner.imageUrl}
                        alt={currentBanner.title}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}

                {/* Gradient Overlay - reversed for RTL */}
                <div className={cn(
                    "absolute inset-0",
                    isRTL
                        ? "bg-gradient-to-l from-black/60 via-black/30 to-transparent"
                        : "bg-gradient-to-r from-black/60 via-black/30 to-transparent"
                )} />

                {/* Content */}
                <div
                    className={cn(
                        "absolute inset-0 flex flex-col justify-center p-6 md:p-8",
                        isRTL ? "items-end" : "items-start"
                    )}
                    style={{
                        direction: isRTL ? 'rtl' : 'ltr',
                        textAlign: isRTL ? 'right' : 'left'
                    }}
                >
                    <h2
                        className="text-white text-xl sm:text-2xl md:text-3xl font-bold mb-2 drop-shadow-lg max-w-md"
                        style={{
                            color: currentBanner.textColor || 'white',
                            direction: isRTL ? 'rtl' : 'ltr',
                            textAlign: isRTL ? 'right' : 'left'
                        }}
                    >
                        {currentBanner.title}
                    </h2>

                    {currentBanner.subtitle && (
                        <p
                            className="text-white/90 text-sm sm:text-base mb-4 max-w-sm drop-shadow"
                            style={{
                                color: currentBanner.textColor || 'white',
                                direction: isRTL ? 'rtl' : 'ltr',
                                textAlign: isRTL ? 'right' : 'left'
                            }}
                        >
                            {currentBanner.subtitle}
                        </p>
                    )}

                    {currentBanner.ctaText && (
                        <Button
                            className="bg-white text-primary hover:bg-white/90 font-semibold rounded-xl shadow-lg"
                        >
                            {currentBanner.ctaText}
                        </Button>
                    )}
                </div>
            </div>

            {/* Dots Indicator */}
            {banners.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {banners.map((_, index) => (
                        <button
                            key={index}
                            className={cn(
                                "w-2 h-2 rounded-full transition-all duration-300",
                                index === activeIndex
                                    ? "bg-white w-6"
                                    : "bg-white/50 hover:bg-white/70"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                goToSlide(index);
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Default promotional banners
export const defaultBanners: Banner[] = [
    {
        id: 1,
        title: "Fresh Produce Sale! 🥬",
        subtitle: "Up to 30% off on fruits and vegetables",
        backgroundColor: "linear-gradient(135deg, #2E9E4F 0%, #1a7035 100%)",
        ctaText: "Shop Now",
    },
    {
        id: 2,
        title: "Weekend Special 🎉",
        subtitle: "Free delivery on orders over 200 EGP",
        backgroundColor: "linear-gradient(135deg, #F5A623 0%, #e8940f 100%)",
        ctaText: "Order Now",
    },
    {
        id: 3,
        title: "New Arrivals 📦",
        subtitle: "Check out our latest products",
        backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        ctaText: "Explore",
    },
];

export default HeroBanner;
