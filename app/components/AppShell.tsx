// app/components/AppShell.tsx
"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LanguageProvider } from "@/app/components/LanguageProvider";
import AIAssistant from "@/app/components/AIAssistant";
import { UiI18nProvider } from "@/app/components/UiI18nProvider";
import PwaInstallPrompt from "@/app/components/PwaInstallPrompt";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  // Hide the floating assistant on AI Chat page
  const hideAssistantOnRoutes = ["/ai-chat"];
  const shouldHideAssistant = hideAssistantOnRoutes.some((p) =>
    pathname.startsWith(p)
  );

  return (
    <LanguageProvider>
      <UiI18nProvider>
        {/* Themed app wrapper */}
        <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
          {children}
          {!shouldHideAssistant && <AIAssistant />}
          <PwaInstallPrompt />
        </div>
      </UiI18nProvider>
    </LanguageProvider>
  );
}
