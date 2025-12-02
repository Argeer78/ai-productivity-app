import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LanguageProvider } from "@/app/components/LanguageProvider";
import ServiceWorkerRegister from "@/app/components/ServiceWorkerRegister";
import AIAssistant from "@/app/components/AIAssistant";
import { UiI18nProvider } from "@/app/components/UiI18nProvider";
import PwaInstallPrompt from "@/app/components/PwaInstallPrompt";
import { ThemeProvider } from "@/app/components/ThemeProvider";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  const hideAssistantOnRoutes = ["/ai-chat"];
  const shouldHideAssistant = hideAssistantOnRoutes.some((p) =>
    pathname.startsWith(p)
  );

  return (
    <ThemeProvider>
      <LanguageProvider>
        <UiI18nProvider>
          <ServiceWorkerRegister />
          {children}
          {!shouldHideAssistant && <AIAssistant />}
          <PwaInstallPrompt />
        </UiI18nProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
