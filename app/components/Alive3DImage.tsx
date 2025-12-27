"use client";

import { useEffect, useState } from "react";
import Image from "next/image"; // Optional if using next/image, but user had <img> before. sticking to img for simplicity or Next Image if preferred. User had <img>.
// Actually, let's use a regular <img> tag to match the existing usage, 
// but wrapped in our logic.

import { useLanguage } from "@/app/components/LanguageProvider"; // context hook if needed, mostly for theme awareness if stored there.
// Assuming theme is in DOM or context. For blending, css 'mix-blend-mode: multiply' works best against light backgrounds.

export default function Alive3DImage({
    src,
    alt,
    className = "",
}: {
    src: string;
    alt: string;
    className?: string;
}) {
    return (
        <div className={`relative group ${className}`}>
            {/* 1. Ambient Background Glow */}
            <div
                className="
          absolute inset-0 z-0
          bg-gradient-to-tr from-[var(--accent)] to-purple-500
          opacity-40 blur-3xl rounded-full
          animate-pulse-slow
          transition-all duration-1000
        "
            />

            {/* 2. Floating Image Container */}
            <div className="relative z-10 animate-float transition-transform duration-500 ease-in-out hover:scale-[1.02]">
                {/* 
           Using blend mode to hide white background on light themes.
           On dark themes, 'multiply' makes the image invisible if it's black on white. 
           We actually want 'multiply' only if the background is light.
           Since we have CSS variables, we can use a trick or just trust the visual design.
           
           However, a 'white' background on a PNG usually needs 'multiply' to transparentize white 
           against a colored background. 
        */}
                <img
                    src={src}
                    alt={alt}
                    className="
                        w-full h-auto 
                        mix-blend-multiply dark:mix-blend-normal 
                        rounded-2xl
                    "
                />

                {/* Optional: Add a subtle inner shadow helper/vignette if needed to blend edges */}
                <div className="absolute inset-0 rounded-2xl ring-1 ring-black/5 dark:ring-white/10 pointer-events-none" />
            </div>
        </div>
    );
}
