import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragDelta, setDragDelta] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const SWIPE_THRESHOLD = 50;

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

    const goToPrev = useCallback(() => {
        setActiveIndex((prev) => (prev - 1 + banners.length) % banners.length);
    }, [banners.length]);

    const goToNext = useCallback(() => {
        setActiveIndex((prev) => (prev + 1) % banners.length);
    }, [banners.length]);

    // Handle drag/swipe start
    const handleDragStart = useCallback((clientX: number) => {
        setIsDragging(true);
        setDragStartX(clientX);
        setDragDelta(0);
        setIsPaused(true);
    }, []);

    // Handle drag/swipe move
    const handleDragMove = useCallback((clientX: number) => {
        if (!isDragging) return;
        const delta = clientX - dragStartX;
        setDragDelta(delta);
    }, [isDragging, dragStartX]);

    // Handle drag/swipe end
    const handleDragEnd = useCallback(() => {
        if (!isDragging) return;

        setIsDragging(false);

        if (Math.abs(dragDelta) > SWIPE_THRESHOLD) {
            // In RTL: swipe right (positive) = next, swipe left (negative) = prev
            // In LTR: swipe left (negative) = next, swipe right (positive) = prev
            if (isRTL) {
                dragDelta > 0 ? goToNext() : goToPrev();
            } else {
                dragDelta < 0 ? goToNext() : goToPrev();
            }
        }

        setDragDelta(0);
        setTimeout(() => setIsPaused(false), 1000);
    }, [isDragging, dragDelta, isRTL, goToPrev, goToNext]);

    // Touch event handlers
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        handleDragStart(e.touches[0].clientX);
    }, [handleDragStart]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        handleDragMove(e.touches[0].clientX);
    }, [handleDragMove]);

    const handleTouchEnd = useCallback(() => {
        handleDragEnd();
    }, [handleDragEnd]);

    // Mouse event handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        handleDragStart(e.clientX);
    }, [handleDragStart]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        handleDragMove(e.clientX);
    }, [handleDragMove]);

    const handleMouseUp = useCallback(() => {
        handleDragEnd();
    }, [handleDragEnd]);

    const handleMouseLeave = useCallback(() => {
        if (isDragging) {
            handleDragEnd();
        }
        setIsPaused(false);
    }, [isDragging, handleDragEnd]);

    if (banners.length === 0) return null;

    // Calculate transform for gallery effect
    const getTranslateX = () => {
        const containerWidth = containerRef.current?.offsetWidth || 300;
        const dragPercent = (dragDelta / containerWidth) * 100;

        if (isRTL) {
            // In RTL, items ordered [2][1][0] starting from right.
            // To see [1] (left of 0), we move Right (positive).
            return (activeIndex * 100) + dragPercent;
        }

        // In LTR, items ordered [0][1][2].
        // To see [1] (right of 0), we move Left (negative).
        return (-activeIndex * 100) + dragPercent;
    };

    return (
        <div
            ref={containerRef}
            className="relative overflow-hidden rounded-2xl select-none"
            onMouseEnter={() => !isDragging && setIsPaused(true)}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'pan-y pinch-zoom' }}
        >
            {/* Slides Container - Gallery Style */}
            <div
                className={cn(
                    "flex",
                    !isDragging && "transition-transform duration-300 ease-out"
                )}
                style={{
                    transform: `translateX(${getTranslateX()}%)`,
                }}
            >
                {banners.map((banner) => (
                    <div
                        key={banner.id}
                        className="w-full flex-shrink-0"
                    >
                        {/* Individual Banner */}
                        <div
                            className={cn(
                                "relative h-40 sm:h-48 md:h-56 lg:h-64 cursor-pointer",
                                "bg-gradient-to-r from-primary to-primary/80"
                            )}
                            style={{
                                background: banner.backgroundColor || undefined,
                            }}
                            onClick={() => !isDragging && Math.abs(dragDelta) < 5 && onBannerClick?.(banner)}
                        >
                            {/* Background Image */}
                            {banner.imageUrl && (
                                <img
                                    src={banner.imageUrl}
                                    alt={banner.title}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    draggable={false}
                                />
                            )}

                            {/* Gradient Overlay */}
                            <div className={cn(
                                "absolute inset-0",
                                isRTL
                                    ? "bg-gradient-to-r from-transparent via-black/30 to-black/60"
                                    : "bg-gradient-to-r from-black/60 via-black/30 to-transparent"
                            )} />

                            {/* Content - Use items-start for RTL because global dir=rtl inverts flex alignment */}
                            <div
                                className={cn(
                                    "absolute inset-0 flex flex-col justify-center p-6 md:p-8",
                                    isRTL
                                        ? "items-start text-right pe-16 ps-6 md:ps-12"
                                        : "items-start text-left ps-6 md:ps-12 pe-16"
                                )}
                            >
                                <h2
                                    className={cn(
                                        "text-white text-xl sm:text-2xl md:text-3xl font-bold mb-2 drop-shadow-lg max-w-md",
                                        isRTL && "text-right"
                                    )}
                                    style={{ color: banner.textColor || 'white' }}
                                >
                                    {banner.title}
                                </h2>

                                {banner.subtitle && (
                                    <p
                                        className={cn(
                                            "text-white/90 text-sm sm:text-base mb-4 max-w-sm drop-shadow",
                                            isRTL && "text-right"
                                        )}
                                        style={{ color: banner.textColor || 'white' }}
                                    >
                                        {banner.subtitle}
                                    </p>
                                )}

                                {banner.ctaText && (
                                    <Button
                                        className="bg-white text-primary hover:bg-white/90 font-semibold rounded-xl shadow-lg"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {banner.ctaText}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Dots Indicator */}
            {banners.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
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
