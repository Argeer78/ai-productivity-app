import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "AI Productivity Hub – Notes, Tasks & AI Tools",
    template: "%s | AI Productivity Hub",
  },
  description:
    "Turn your messy notes into clear tasks and summaries with AI. Free to start, built for clarity. Upgrade to Pro for higher limits.",
  keywords: [
    "AI notes",
    "AI productivity",
    "AI task manager",
    "Next.js Supabase Stripe OpenAI",
    "note taking app",
    "AI writing assistant",
  ],
  authors: [{ name: "AI Productivity Hub" }],
  creator: "AI Productivity Hub",
  openGraph: {
    title: "AI Productivity Hub – Notes, Tasks & AI Tools",
    description:
      "Turn your messy notes into clear tasks and summaries with AI. Free to start, built for clarity.",
    url: "https://ai-productivity-app-5zah.vercel.app/",
    siteName: "AI Productivity Hub",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AI Productivity Hub",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Productivity Hub",
    description:
      "Turn your messy notes into clear tasks and summaries with AI.",
    images: ["/og-image.png"],
  },
  themeColor: "#0f172a",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-950 text-slate-100`}>
        {children}
      </body>
    </html>
  );
}
