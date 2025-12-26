"use client";

import { useFocus } from "@/app/context/FocusContext";
import FocusOverlay from "@/app/components/FocusOverlay";
import FloatingPlayer from "@/app/components/FloatingPlayer";

export default function GlobalFocusPlayer() {
    const { isActive, isMinimized } = useFocus();

    if (!isActive) return null;

    return (
        <>
            {!isMinimized && <FocusOverlay />}
            {isMinimized && <FloatingPlayer />}
        </>
    );
}
