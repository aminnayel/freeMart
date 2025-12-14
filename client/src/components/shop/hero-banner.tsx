import { useState, useEffect, useRef, useCallback } from "react";
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
    // For infinite scroll, we use a virtual index that can go beyond array bounds
    // Actual slides: [clone-last, ...banners, clone-first]
    // Virtual index 0 = clone of last, 1 = first real, ..., n = last real, n+1 = clone of first
    const [currentIndex, setCurrentIndex] = useState(1); // Start at first real slide
    const [isTransitioning, setIsTransitioning] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragDelta, setDragDelta] = useState(0);
    const hasDragged = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const SWIPE_THRESHOLD = 50;
    const DRAG_THRESHOLD = 5;

    // Create extended array with clones for infinite effect
    const extendedBanners = banners.length > 0
        ? [banners[banners.length - 1], ...banners, banners[0]]
        : [];

    // Get the real index (0-based) for dot indicator
    const getRealIndex = () => {
        if (currentIndex === 0) return banners.length - 1;
        if (currentIndex === extendedBanners.length - 1) return 0;
        return currentIndex - 1;
    };

    // Handle seamless loop reset
    useEffect(() => {
        if (!isTransitioning) {
            // Re-enable transition after instant jump
            const timer = setTimeout(() => setIsTransitioning(true), 50);
            return () => clearTimeout(timer);
        }
    }, [isTransitioning]);

    // Check if we need to do an instant jump after transition ends
    const handleTransitionEnd = useCallback(() => {
        if (currentIndex === 0) {
            // Jumped to clone at start, instantly go to real last slide
            setIsTransitioning(false);
            setCurrentIndex(extendedBanners.length - 2);
        } else if (currentIndex === extendedBanners.length - 1) {
            // Jumped to clone at end, instantly go to real first slide
            setIsTransitioning(false);
            setCurrentIndex(1);
        }
    }, [currentIndex, extendedBanners.length]);

    // Auto-play
    useEffect(() => {
        if (isPaused || banners.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => prev + 1);
        }, autoPlayInterval);

        return () => clearInterval(timer);
    }, [isPaused, banners.length, autoPlayInterval]);

    const goToSlide = (realIndex: number) => {
        setCurrentIndex(realIndex + 1); // +1 because of clone at start
    };

    const goToPrev = useCallback(() => {
        setCurrentIndex((prev) => prev - 1);
    }, []);

    const goToNext = useCallback(() => {
        setCurrentIndex((prev) => prev + 1);
    }, []);

    // Handle drag/swipe start
    const handleDragStart = useCallback((clientX: number) => {
        setIsDragging(true);
        setDragStartX(clientX);
        setDragDelta(0);
        hasDragged.current = false;
        setIsPaused(true);
    }, []);

    // Handle drag/swipe move
    const handleDragMove = useCallback((clientX: number) => {
        if (!isDragging) return;
        const delta = clientX - dragStartX;
        setDragDelta(delta);
        if (Math.abs(delta) > DRAG_THRESHOLD) {
            hasDragged.current = true;
        }
    }, [isDragging, dragStartX]);

    // Handle drag/swipe end
    const handleDragEnd = useCallback(() => {
        if (!isDragging) return;

        setIsDragging(false);

        if (Math.abs(dragDelta) > SWIPE_THRESHOLD) {
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

    // Calculate transform
    const getTranslateX = () => {
        const containerWidth = containerRef.current?.offsetWidth || 300;
        const dragPercent = (dragDelta / containerWidth) * 100;

        if (isRTL) {
            return (currentIndex * 100) + dragPercent;
        }
        return (-currentIndex * 100) + dragPercent;
    };

    // Render a single banner slide
    const renderBanner = (banner: Banner, index: number) => (
        <div
            key={`slide-${index}`}
            className="w-full flex-shrink-0"
        >
            <div
                className={cn(
                    "relative h-40 sm:h-48 md:h-56 lg:h-64 cursor-pointer",
                    "bg-gradient-to-r from-primary to-primary/80"
                )}
                style={{
                    background: banner.backgroundColor || undefined,
                }}
                onClick={() => {
                    if (!hasDragged.current) {
                        onBannerClick?.(banner);
                    }
                }}
            >
                {banner.imageUrl && (
                    <img
                        src={banner.imageUrl}
                        alt={banner.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        draggable={false}
                    />
                )}

                <div className={cn(
                    "absolute inset-0",
                    isRTL
                        ? "bg-gradient-to-r from-transparent via-black/30 to-black/60"
                        : "bg-gradient-to-r from-black/60 via-black/30 to-transparent"
                )} />

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
                </div>
            </div>
        </div>
    );

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
            {/* Slides Container */}
            <div
                className={cn(
                    "flex",
                    isTransitioning && !isDragging && "transition-transform duration-300 ease-out"
                )}
                style={{
                    transform: `translateX(${getTranslateX()}%)`,
                }}
                onTransitionEnd={handleTransitionEnd}
            >
                {extendedBanners.map((banner, index) => renderBanner(banner, index))}
            </div>

            {/* Dots Indicator */}
            {banners.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {banners.map((_, index) => (
                        <button
                            key={index}
                            className={cn(
                                "w-2 h-2 rounded-full transition-all duration-300",
                                index === getRealIndex()
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

