import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface AutoScrollAreaProps {
    children: React.ReactNode;
    className?: string;
    paused?: boolean;
    speed?: number;
    intervalMs?: number;
    direction?: 'ltr' | 'rtl';
}

export function AutoScrollArea({
    children,
    className,
    speed = 1,
    intervalMs = 50,
    paused = false,
    direction = 'ltr'
}: AutoScrollAreaProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const scrollPosition = useRef(0);
    const maxScroll = useRef(0);

    // Calculate max scroll based on content width
    useEffect(() => {
        const content = contentRef.current;
        if (content) {
            maxScroll.current = content.offsetWidth + 16; // content width + gap
        }
    }, [children]);

    // Handle mouse wheel for horizontal scrolling on desktop
    const handleWheel = useCallback((e: WheelEvent) => {
        const container = containerRef.current;
        if (!container || !isHovered) return;

        // Prevent vertical page scroll when scrolling horizontally
        e.preventDefault();

        const isRTL = direction === 'rtl';
        const loopPoint = maxScroll.current;

        // Use deltaY for horizontal scroll (most common wheel behavior)
        // Multiply by a factor for comfortable scrolling speed
        const scrollDelta = e.deltaY * 0.5;

        if (isRTL) {
            scrollPosition.current -= scrollDelta;
        } else {
            scrollPosition.current += scrollDelta;
        }

        // Keep scroll within bounds and wrap around for seamless loop
        if (scrollPosition.current >= loopPoint) {
            scrollPosition.current -= loopPoint;
        } else if (scrollPosition.current < 0) {
            scrollPosition.current += loopPoint;
        }

        // Apply scroll immediately
        const innerContainer = container.querySelector('.scroll-content') as HTMLElement;
        if (innerContainer) {
            const translateX = isRTL ? scrollPosition.current : -scrollPosition.current;
            innerContainer.style.transform = `translateX(${translateX}px)`;
        }
    }, [isHovered, direction]);

    // Add wheel event listener (needs { passive: false } to prevent default)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    useEffect(() => {
        const container = containerRef.current;
        const content = contentRef.current;
        if (!container || !content) return;

        // For RTL, we need to handle scroll differently
        const isRTL = direction === 'rtl';

        const interval = setInterval(() => {
            if (!isHovered && !paused && container && content) {
                // Determine loop point: width of single set + gap (16px from gap-4)
                const loopPoint = content.offsetWidth + 16;

                // LTR (English): scroll RIGHT = content moves LEFT = negative translateX = increment position
                // RTL (Arabic): scroll LEFT = content moves RIGHT = positive translateX = decrement position
                if (isRTL) {
                    scrollPosition.current -= speed; // RTL: decrement for left scroll
                    if (scrollPosition.current <= -loopPoint) {
                        scrollPosition.current += loopPoint;
                    }
                } else {
                    scrollPosition.current += speed; // LTR: increment for right scroll
                    if (scrollPosition.current >= loopPoint) {
                        scrollPosition.current -= loopPoint;
                    }
                }

                // Apply scroll - use transform for smoother animation
                const innerContainer = container.querySelector('.scroll-content') as HTMLElement;
                if (innerContainer) {
                    // LTR: negative translateX (content moves left, viewport scrolls right)
                    // RTL: positive translateX (content moves right, viewport scrolls left)
                    const translateX = -scrollPosition.current;
                    innerContainer.style.transform = `translateX(${translateX}px)`;
                }
            }
        }, intervalMs);

        return () => clearInterval(interval);
    }, [isHovered, paused, speed, intervalMs, direction]);

    // Reset position on hover end for smooth user experience
    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    return (
        <div
            ref={containerRef}
            className={cn("overflow-hidden cursor-grab active:cursor-grabbing", className)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            onTouchStart={() => setIsHovered(true)}
            onTouchEnd={() => setIsHovered(false)}
        >
            <div className="scroll-content flex gap-4 min-w-max transition-none">
                {/* First Set */}
                <div ref={contentRef} className="flex gap-4">
                    {children}
                </div>
                {/* Duplicate Set for Seamless Loop */}
                <div className="flex gap-4" aria-hidden="true">
                    {children}
                </div>
            </div>
        </div>
    );
}

