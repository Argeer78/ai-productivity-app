"use client";

import { useEffect, useState } from "react";

export default function AnimatedNumber({
    value,
    duration = 1000,
    className,
}: {
    value: number;
    duration?: number;
    className?: string;
}) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime: number | null = null;
        const startValue = 0;
        const endValue = value;

        // smooth ease-out function
        const easeOutQuart = (x: number): number => 1 - Math.pow(1 - x, 4);

        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeProgress = easeOutQuart(progress);

            const current = Math.floor(startValue + (endValue - startValue) * easeProgress);
            setDisplayValue(current);

            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };

        window.requestAnimationFrame(step);
    }, [value, duration]);

    return <span className={className}>{displayValue}</span>;
}
