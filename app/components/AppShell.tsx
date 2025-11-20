// app/components/AppShell.tsx
"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LanguageProvider } from "@/app/components/LanguageProvider";
import ServiceWorkerRegister from "@/app/components/ServiceWorkerRegister";
import AIAssistant from "@/app/components/AIAssistant";
import { UiI18nProvider } from "@/app/components/UiI18nProvider";

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
        <ServiceWorkerRegister />
        {children}
        {!shouldHideAssistant && <AIAssistant />}
      </UiI18nProvider>
    </LanguageProvider>
  );
}
