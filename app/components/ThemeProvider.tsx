"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"      // adds "class='light|dark'" on <html>
      defaultTheme="system"  // follow OS by default
      enableSystem
    >
      {children}
    </NextThemesProvider>
  );
}
