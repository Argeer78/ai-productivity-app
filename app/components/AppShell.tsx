// app/components/AppShell.tsx
"use client";

import { ReactNode } from "react";
import { LanguageProvider } from "@/app/components/LanguageProvider";
import { UiStringsProvider } from "@/app/components/UiStringsProvider";
import AIAssistant from "@/app/components/AIAssistant";
import PwaInstallPrompt from "@/app/components/PwaInstallPrompt";
import { ThemeProvider } from "@/app/components/ThemeProvider";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <LanguageProvider>
      <UiStringsProvider>
        <ThemeProvider>
          {children}
          <AIAssistant />
          <PwaInstallPrompt />
        </ThemeProvider>
      </UiStringsProvider>
    </LanguageProvider>
  );
}
