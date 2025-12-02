// app/components/AppShell.tsx
"use client";

import { ReactNode } from "react";
import { LanguageProvider } from "@/app/components/LanguageProvider";
import AIAssistant from "@/app/components/AIAssistant";
import { UiI18nProvider } from "@/app/components/UiI18nProvider";
import PwaInstallPrompt from "@/app/components/PwaInstallPrompt";
import { ThemeProvider } from "@/app/components/ThemeProvider";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <LanguageProvider>
      <UiI18nProvider>
        <ThemeProvider>
          {children}
          <AIAssistant />
          <PwaInstallPrompt />
        </ThemeProvider>
      </UiI18nProvider>
    </LanguageProvider>
  );
}
