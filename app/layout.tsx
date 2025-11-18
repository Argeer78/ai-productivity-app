// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import PlausibleProvider from "next-plausible";
import AIAssistant from "@/app/components/AIAssistant";
import { LanguageProvider } from "@/app/components/LanguageProvider";
import ServiceWorkerRegistrar from "./components/ServiceWorkerRegistrar";
// If you created this earlier for the “install app” prompt, keep it.
// If not, remove this import & <PwaInstallPrompt /> below.
import PwaInstallPrompt from "./components/PwaInstallPrompt";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title:
    "AI Productivity Hub – Notes, Tasks, Planner & AI Coach in one place",
  description:
    "AI Productivity Hub is a simple, focused workspace for notes, tasks, daily score tracking, weekly reports and travel planning – all powered by AI.",
  openGraph: {
    title: "AI Productivity Hub",
    description:
      "Stay organized with notes, tasks, daily success score, weekly reports and an AI travel planner in one clean app.",
    url: "https://aiprod.app",
    siteName: "AI Productivity Hub",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Productivity Hub",
    description:
      "Stay organized with notes, tasks, daily success score, weekly reports and an AI travel planner in one clean app.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.webmanifest",
  themeColor: "#020617",
};

export const viewport: Viewport = {
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-950 text-slate-100`}>
        <PlausibleProvider
          domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || "aiprod.app"}
          trackLocalhost={false}
        >
          {/* PWA service worker + install prompt */}
          <ServiceWorkerRegistrar />
          {/* Remove this if you didn’t actually create the component */}
          <PwaInstallPrompt />

          {/* App providers + UI */}
          <LanguageProvider>
            {children}
            <AIAssistant />
          </LanguageProvider>
        </PlausibleProvider>
      </body>
    </html>
  );
}
