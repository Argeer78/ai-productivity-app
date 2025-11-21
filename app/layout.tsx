// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import PlausibleProvider from "next-plausible";
import AppShell from "@/app/components/AppShell";
import ServiceWorkerRegister from "@/app/components/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Productivity Hub – Notes, Tasks, Planner & AI Coach in one place",
  description:
    "AI Productivity Hub is a simple, focused workspace for notes, tasks, daily score tracking, weekly reports and travel planning – all powered by AI.",
  openGraph: {
    title: "AI Productivity Hub",
    description:
      "Stay organized with notes, tasks, daily success score, weekly reports and an AI travel planner in one clean app.",
    url: "https://aiprod.app",
    siteName: "AI Productivity Hub",
    type: "website",
    images: ["/og-image.png"]
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Productivity Hub",
    description:
      "Stay organized with notes, tasks, daily success score, weekly reports and an AI travel planner in one clean app.",
    images: ["/og-image.png"]
  }
};

export const viewport: Viewport = {
  themeColor: "#020617"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* 👇 This is the key line */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#020617" />
      </head>
      <body className={`${inter.className} bg-[#020617] text-slate-100`}>
        <PlausibleProvider
          domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || "aiprod.app"}
          trackLocalhost={false}
        />
        <ServiceWorkerRegister />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
