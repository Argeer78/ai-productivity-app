"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function HideDevTools() {
    const searchParams = useSearchParams();
    // Robust detection: Check hook or raw URL (for static export/nav edge cases)
    const isPromo = searchParams.get("promo_mode") === "true" ||
        (typeof window !== 'undefined' && window.location.href.includes('promo_mode=true'));

    useEffect(() => {
        // Debug log to confirm activation
        if (typeof window !== 'undefined') {
            console.log("[HideDevTools] Active?", isPromo, "URL:", window.location.href);
        }

        if (isPromo) {
            const style = document.createElement("style");
            style.innerHTML = `
                /* AGGRESSIVE RESET for Live App Mode */
                
                /* 1. Hide scrollbars everywhere but keep scrollability */
                * {
                    scrollbar-width: none !important;
                    -ms-overflow-style: none !important;
                }
                *::-webkit-scrollbar {
                    display: none !important;
                    width: 0px !important;
                    height: 0px !important;
                    background: transparent !important;
                }

                /* 2. Lock down the root containers */
                html {
                   width: 100% !important;
                   height: 100% !important;
                   overflow-x: hidden !important;
                }

                body {
                    /* Simulate High-DPI Mobile Viewport */
                    transform: scale(0.75); /* Zoom out */
                    transform-origin: top left;
                    
                    /* Compensate width/height for the scale */
                    width: 133.333% !important;
                    min-height: 133.333% !important;
                    
                    overflow-x: hidden !important;
                    overflow-y: auto !important; 
                    overscroll-behavior-y: none;
                    
                    /* Reset margins to prevent offset */
                    margin: 0 !important;
                }

                /* 3. Force Header to fit the SCALED width */
                header {
                    width: 100% !important;
                    max-width: 100% !important;
                    padding-right: 0 !important;
                    margin-right: 0 !important;
                    overflow-x: hidden !important;
                }
                
                /* 4. Fix inner header containers that might have fixed widths */
                header > div {
                    max-width: 100% !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                }

                /* 5. Hide Dev Tools */
                nextjs-portal, #next-route-announcer, vercel-live-feedback {
                    display: none !important;
                }
            `;
            // Append to head
            document.head.appendChild(style);

            // Also force class on body just in case
            document.body.style.overflowX = "hidden";
            document.body.style.maxWidth = "100vw";

            return () => {
                document.head.removeChild(style);
                document.body.style.overflowX = "";
                document.body.style.maxWidth = "";
            };
        }
    }, [isPromo]);

    return null;
}
