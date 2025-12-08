import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AutoScrollAreaProps {
    children: React.ReactNode;
    className?: string;
    paused?: boolean;
    speed?: number;
    intervalMs?: number;
}

export function AutoScrollArea({
    children,
    className,
    speed = 1,
    intervalMs = 50,
    paused = false
}: AutoScrollAreaProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        const content = contentRef.current;
        if (!container || !content) return;

        const interval = setInterval(() => {
            if (!isHovered && !paused && container && content) {
                // Determine loop point: width of single set + gap (16px from gap-4)
                const loopPoint = content.offsetWidth + 16;

                if (container.scrollLeft >= loopPoint) {
                    // Seamlessly reset to 0 (which looks identical to start of 2nd set)
                    // Subtract loopPoint to maintain precise sub-pixel offset if any
                    container.scrollLeft -= loopPoint;
                } else {
                    container.scrollLeft += speed;
                }
            }
        }, intervalMs);

        return () => clearInterval(interval);
    }, [isHovered, paused, speed, intervalMs]);

    return (
        <div
            ref={containerRef}
            className={cn("overflow-x-auto scrollbar-none", className)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={() => setIsHovered(true)}
            onTouchEnd={() => setIsHovered(false)}
        >
            <div className="flex gap-4 min-w-max">
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
