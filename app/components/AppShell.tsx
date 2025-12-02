// app/components/AppShell.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { LanguageProvider } from "@/app/components/LanguageProvider";
import AIAssistant from "@/app/components/AIAssistant";
import { UiI18nProvider } from "@/app/components/UiI18nProvider";
import PwaInstallPrompt from "@/app/components/PwaInstallPrompt";
import { ThemeProvider } from "@/app/components/ThemeProvider";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const [pathname, setPathname] = useState<string>("");

  // Get current path on the client (no next/navigation hook needed)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPathname(window.location.pathname);
    }
  }, []);

  // Hide the floating assistant on AI Chat page
  const hideAssistantOnRoutes = ["/ai-chat"];
  const shouldHideAssistant = hideAssistantOnRoutes.some((p) =>
    pathname.startsWith(p)
  );

  return (
<ThemeProvider>
    <LanguageProvider>
      <UiI18nProvider>
        {children}
        {!shouldHideAssistant && <AIAssistant />}
        <PwaInstallPrompt />
      </UiI18nProvider>
    </LanguageProvider>
</ThemeProvider>
  );
}
