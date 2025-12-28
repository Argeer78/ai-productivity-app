// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import PlausibleProvider from "next-plausible";

import AppShell from "@/app/components/AppShell";
import ServiceWorkerRegister from "@/app/components/ServiceWorkerRegister";
import { RtlDirectionManager } from "@/app/components/RtlDirectionManager";
import TwaInit from "@/app/TwaInit";
import AppBoot from "@/app/components/AppBoot";
import FacebookRedirectGuard from "@/app/components/FacebookRedirectGuard";
import { UiLanguageProvider } from "@/app/components/UiLanguageProvider"; // ✅ NEW
import { FocusProvider } from "@/app/context/FocusContext";
import GlobalFocusPlayer from "@/app/components/GlobalFocusPlayer";

const inter = Inter({ subsets: ["latin"] });
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://aiprod.app"),
  title: "AI Productivity Hub – Notes, Tasks, Planner & AI Coach in one place",
  description:
    "AI Productivity Hub is a simple, focused workspace for notes, tasks, daily score tracking, weekly reports and travel planning – all powered by AI.",
  keywords: ["AI productivity", "daily planner", "task manager", "AI notes", "travel planner", "weekly report", "habit tracker"],
  alternates: {
    canonical: "https://aiprod.app",
  },
  applicationName: "AI Productivity Hub",
  category: "productivity",
  openGraph: {
    title: "AI Productivity Hub",
    description:
      "Stay organized with notes, tasks, daily success score, weekly reports and an AI travel planner in one clean app.",
    url: "https://aiprod.app",
    siteName: "AI Productivity Hub",
    type: "website",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Productivity Hub",
    description:
      "Stay organized with notes, tasks, daily success score, weekly reports and an AI travel planner in one clean app.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI Productivity Hub",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "AI-powered productivity workspace for notes, tasks, and planning."
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#020617" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>

      <body className={inter.className}>
        {/* ✅ Make language available everywhere (including /auth) */}
        <UiLanguageProvider>
          <FocusProvider>
            <AppBoot>
              {/* 🚫 FB / Instagram in-app browser protection */}
              <FacebookRedirectGuard />

              {/* 🔗 TWA postMessage init */}
              <TwaInit />

              <PlausibleProvider
                domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || "aiprod.app"}
                trackLocalhost={false}
              >
                {/* ✅ RTL manager can now react to chosen language too */}
                <RtlDirectionManager>
                  <AppShell>
                    {children}
                    {/* 🌍 Global Focus Player (Overlay + Floating) */}
                    <GlobalFocusPlayer />
                  </AppShell>
                </RtlDirectionManager>
              </PlausibleProvider>

              {/* 🧩 Service worker (once) */}
              <ServiceWorkerRegister />
            </AppBoot>
          </FocusProvider>
        </UiLanguageProvider>
      </body>
    </html>
  );
}
