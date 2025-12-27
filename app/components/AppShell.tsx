// app/components/AppShell.tsx
"use client";

import { ReactNode } from "react";
import { LanguageProvider } from "@/app/components/LanguageProvider";
import { UiStringsProvider } from "@/app/components/UiStringsProvider";
import AIAssistant from "@/app/components/AIAssistant";
import PwaInstallPrompt from "@/app/components/PwaInstallPrompt";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import GlobalFocusPlayer from "@/app/components/GlobalFocusPlayer";
import FocusMate from "@/app/components/FocusMate";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <UiStringsProvider>
        <ThemeProvider>
          <GlobalFocusPlayer />
          <FocusMate />
          {children}
          <AIAssistant />
          <PwaInstallPrompt />
        </ThemeProvider>
      </UiStringsProvider>
    </LanguageProvider>
  );
}
