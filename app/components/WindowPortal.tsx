import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface WindowPortalProps {
    title?: string;
    onClose?: () => void;
    children: React.ReactNode;
}

export const WindowPortal: React.FC<WindowPortalProps> = ({ title = 'Studio Controller', onClose, children }) => {
    const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
    const externalWindowRef = useRef<Window | null>(null);

    useLayoutEffect(() => {
        // Create new window
        const newWindow = window.open('', '', 'width=600,height=800,left=200,top=200');
        externalWindowRef.current = newWindow;

        if (!newWindow) {
            console.error("Popup blocked! Please allow popups.");
            return;
        }

        // Set title
        newWindow.document.title = title;

        // Copy styles from main window to ensure Tailwind/CSS works
        Array.from(document.styleSheets).forEach((styleSheet) => {
            try {
                if (styleSheet.href) {
                    const newLinkEl = newWindow.document.createElement('link');
                    newLinkEl.rel = 'stylesheet';
                    newLinkEl.href = styleSheet.href;
                    newWindow.document.head.appendChild(newLinkEl);
                } else {
                    // Internal styles (style tags)
                    const newStyleEl = newWindow.document.createElement('style');
                    Array.from(styleSheet.cssRules).forEach(rule => {
                        newStyleEl.appendChild(newWindow.document.createTextNode(rule.cssText));
                    });
                    newWindow.document.head.appendChild(newStyleEl);
                }
            } catch (e) {
                console.warn("Could not copy stylesheet", e);
            }
        });

        // Also copy tailwind base styles if they are missing (often in <style> tags in Next.js)
        const styleTags = document.querySelectorAll('style');
        styleTags.forEach(tag => {
            newWindow.document.head.appendChild(tag.cloneNode(true));
        });


        // Create container
        const el = newWindow.document.createElement('div');
        el.id = 'portal-root';
        // Add dark mode class if present on main body
        if (document.documentElement.classList.contains('dark')) {
            newWindow.document.documentElement.classList.add('dark');
            el.classList.add('dark');
        }
        el.className = "h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 overflow-auto";

        newWindow.document.body.appendChild(el);
        newWindow.document.body.className = "m-0 p-0 overflow-hidden";

        setContainerEl(el);

        // Handle close
        newWindow.addEventListener('beforeunload', () => {
            onClose?.();
        });

        return () => {
            newWindow.close();
            externalWindowRef.current = null;
        };
    }, []);

    if (!containerEl) return null;

    return createPortal(children, containerEl);
};
