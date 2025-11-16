// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import AIAssistant from "@/app/components/AIAssistant";

// Plausible analytics (optional)
import PlausibleProvider from "next-plausible";

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
    images: [{ url: "/og-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Productivity Hub",
    description:
      "Capture notes, manage tasks, and let AI plan your day.",
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
      <head />
      <body className={inter.className}>
        <PlausibleProvider
          domain={
            process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || "aiprod.app"
          }
          trackLocalhost={false}
        >
          {children}
          <AIAssistant />
        </PlausibleProvider>
      </body>
    </html>
  );
}
