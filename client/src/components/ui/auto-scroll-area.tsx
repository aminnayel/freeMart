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

const DRAG_THRESHOLD = 5; // Minimum pixels to consider it a drag vs click

export function AutoScrollArea({
    children,
    className,
    speed = 0.3,
    intervalMs = 20,
    paused = false,
    direction = 'ltr'
}: AutoScrollAreaProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const scrollPosition = useRef(0);
    const maxScroll = useRef(0);

    // Mouse drag state
    const [isDragging, setIsDragging] = useState(false);
    const dragStartX = useRef(0);
    const dragStartScroll = useRef(0);
    const hasDragged = useRef(false); // Track if actual dragging occurred

    // Calculate max scroll based on content width
    useEffect(() => {
        const content = contentRef.current;
        if (content) {
            maxScroll.current = content.offsetWidth + 16;
        }
    }, [children]);

    // Reset scroll position when direction changes
    useEffect(() => {
        scrollPosition.current = 0;
        const container = containerRef.current;
        if (container) {
            const innerContainer = container.querySelector('.scroll-content') as HTMLElement;
            if (innerContainer) {
                innerContainer.style.transform = `translateX(0px)`;
            }
        }
    }, [direction]);

    // Handle mouse wheel for horizontal scrolling on desktop
    const handleWheel = useCallback((e: WheelEvent) => {
        const container = containerRef.current;
        if (!container || !isHovered) return;

        e.preventDefault();
        e.stopPropagation();

        const isRTL = direction === 'rtl';
        const loopPoint = maxScroll.current;
        const scrollDelta = e.deltaY * 0.5;

        if (isRTL) {
            scrollPosition.current -= scrollDelta;
        } else {
            scrollPosition.current += scrollDelta;
        }

        if (scrollPosition.current >= loopPoint) {
            scrollPosition.current -= loopPoint;
        } else if (scrollPosition.current < 0) {
            scrollPosition.current += loopPoint;
        }

        const innerContainer = container.querySelector('.scroll-content') as HTMLElement;
        if (innerContainer) {
            if (isRTL) {
                innerContainer.style.transform = `translateX(${scrollPosition.current}px)`;
            } else {
                innerContainer.style.transform = `translateX(${-scrollPosition.current}px)`;
            }
        }
    }, [isHovered, direction]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    // Mouse drag handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setIsDragging(true);
        hasDragged.current = false; // Reset drag flag
        dragStartX.current = e.clientX;
        dragStartScroll.current = scrollPosition.current;
        e.preventDefault();
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;

        const container = containerRef.current;
        if (!container) return;

        const delta = e.clientX - dragStartX.current;

        // Check if we've moved past the threshold
        if (Math.abs(delta) > DRAG_THRESHOLD) {
            hasDragged.current = true;
        }

        const loopPoint = maxScroll.current;

        // Drag direction is the same for both LTR and RTL - drag left = scroll left
        scrollPosition.current = dragStartScroll.current - delta;

        if (scrollPosition.current >= loopPoint) {
            scrollPosition.current -= loopPoint;
        } else if (scrollPosition.current < 0) {
            scrollPosition.current += loopPoint;
        }

        const innerContainer = container.querySelector('.scroll-content') as HTMLElement;
        if (innerContainer) {
            const isRTL = direction === 'rtl';
            if (isRTL) {
                innerContainer.style.transform = `translateX(${scrollPosition.current}px)`;
            } else {
                innerContainer.style.transform = `translateX(${-scrollPosition.current}px)`;
            }
        }
    }, [isDragging, direction]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsDragging(false);
        setIsHovered(false);
    }, []);

    // Block clicks if dragging occurred
    const handleClick = useCallback((e: React.MouseEvent) => {
        if (hasDragged.current) {
            e.preventDefault();
            e.stopPropagation();
            hasDragged.current = false;
        }
    }, []);

    // Auto-scroll animation
    useEffect(() => {
        const container = containerRef.current;
        const content = contentRef.current;
        if (!container || !content) return;

        const isRTL = direction === 'rtl';

        const interval = setInterval(() => {
            if (!isHovered && !paused && !isDragging && container && content) {
                const loopPoint = content.offsetWidth + 16;

                // Both LTR and RTL: increment position for consistent visual flow
                // The direction difference is handled by which way items appear to move
                scrollPosition.current += speed;
                if (scrollPosition.current >= loopPoint) {
                    scrollPosition.current -= loopPoint;
                }

                const innerContainer = container.querySelector('.scroll-content') as HTMLElement;
                if (innerContainer) {
                    // RTL: scroll in opposite direction (positive translateX)
                    // LTR: scroll in normal direction (negative translateX)
                    if (isRTL) {
                        innerContainer.style.transform = `translateX(${scrollPosition.current}px)`;
                    } else {
                        innerContainer.style.transform = `translateX(${-scrollPosition.current}px)`;
                    }
                }
            }
        }, intervalMs);

        return () => clearInterval(interval);
    }, [isHovered, paused, isDragging, speed, intervalMs, direction]);

    return (
        <div
            ref={containerRef}
            className={cn(
                "overflow-hidden select-none",
                isDragging ? "cursor-grabbing" : "cursor-grab",
                className
            )}
            style={{
                overscrollBehaviorY: 'contain',
                touchAction: 'pan-y pinch-zoom'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClickCapture={handleClick}
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
