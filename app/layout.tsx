// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import AIAssistant from "@/app/components/AIAssistant";
import PlausibleProvider from "next-plausible";
import { LanguageProvider } from "@/app/components/LanguageProvider";

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
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <PlausibleProvider
          domain={
            process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || "aiprod.app"
          }
          trackLocalhost={false}
        />
      </head>
      <body className={inter.className}>
        <LanguageProvider>
          {children}
          <AIAssistant />
        </LanguageProvider>
      </body>
    </html>
  );
}
// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Productivity Hub",
  description: "Your AI workspace for focus, planning & tiny wins.",
  themeColor: "#020617",
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
// app/layout.tsx
import ServiceWorkerRegistrar from "./components/ServiceWorkerRegistrar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
