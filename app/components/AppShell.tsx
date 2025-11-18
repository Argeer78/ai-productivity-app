"use client";

import { usePathname } from "next/navigation";
import AIAssistant from "@/app/components/AIAssistant";
import { LanguageProvider } from "@/app/components/LanguageProvider";
import ServiceWorkerRegistrar from "@/app/components/ServiceWorkerRegistrar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Routes where the floating assistant should be hidden
  const hideAssistantOnRoutes = ["/ai-chat"];
  const shouldHideAssistant = hideAssistantOnRoutes.some((p) =>
    pathname.startsWith(p)
  );

  return (
    <LanguageProvider>
      <ServiceWorkerRegistrar />
      {children}
      {!shouldHideAssistant && <AIAssistant />}
    </LanguageProvider>
  );
}
