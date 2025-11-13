// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import AIAssistant from "@/app/components/AIAssistant";

// If you installed Plausible, keep this import; otherwise comment it out or remove the component below.
// npm i next-plausible
import PlausibleProvider from "next-plausible";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Productivity Hub",
  description:
    "Notes, tasks, and an AI that actually helps. Start free, upgrade anytime.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://aiprod.app/"
  ),
  openGraph: {
    title: "AI Productivity Hub",
    description: "Capture notes, manage tasks, and let AI plan your day.",
    images: [{ url: "/og-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Productivity Hub",
    description: "Capture notes, manage tasks, and let AI plan your day.",
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
        {/* Plausible analytics (optional) */}
        <PlausibleProvider
          domain={
            process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ||
            "aiprod.app/"
          }
          trackLocalhost={false}
        />
      </head>
      <body className={inter.className}>{children}<AIAssistant /></body>
    </html>
  );
}
