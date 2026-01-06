import { useState, useEffect } from "react";

const GUEST_USAGE_KEY = "aph_guest_ai_usage";
const GUEST_LIMIT = 5;

export function useGuestUsage() {
    const [usage, setUsage] = useState(0);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem(GUEST_USAGE_KEY);
            if (stored) {
                setUsage(parseInt(stored, 10));
            }
        }
    }, []);

    const increment = () => {
        const newVal = usage + 1;
        setUsage(newVal);
        if (typeof window !== "undefined") {
            localStorage.setItem(GUEST_USAGE_KEY, String(newVal));
        }
        return newVal;
    };

    const limitReached = usage >= GUEST_LIMIT;
    const remaining = Math.max(0, GUEST_LIMIT - usage);

    return {
        usage,
        limit: GUEST_LIMIT,
        remaining,
        limitReached,
        increment,
    };
}
