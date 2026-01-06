// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import PlausibleProvider from "next-plausible";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next"
import { DemoProvider } from "@/app/context/DemoContext";
import DemoBanner from "@/app/components/DemoBanner";

// ✅ Auth gate (full page always)
import ServiceWorkerRegister from "@/app/components/ServiceWorkerRegister";
import AppShell from "@/app/components/AppShell";
import { RtlDirectionManager } from "@/app/components/RtlDirectionManager";
import TwaInit from "@/app/TwaInit";
import AppBoot from "@/app/components/AppBoot";
import { UiLanguageProvider } from "@/app/components/UiLanguageProvider"; // ✅ NEW
import { FocusProvider } from "@/app/context/FocusContext";
import GlobalFocusPlayer from "@/app/components/GlobalFocusPlayer";
import GlobalScreenRecorder from "@/app/components/GlobalScreenRecorder";

const inter = Inter({ subsets: ["latin"] });
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://aiprod.app"),
  title: process.env.NODE_ENV === 'development' ? '[DEV] AI Productivity Hub' : "AI Productivity Hub – Notes, Tasks, Planner & AI Coach in one place",
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
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17847132623"
          strategy="afterInteractive"
        />
        <Script id="google-ads-tag" strategy="afterInteractive">
          {`
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());

gtag('config', 'AW-17847132623');
`}
        </Script>
        <Script
          id="facebook-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
!function (f, b, e, v, n, t, s) {
  if (f.fbq) return; n = f.fbq = function () {
    n.callMethod ?
    n.callMethod.apply(n, arguments) : n.queue.push(arguments)
  };
  if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
  n.queue = []; t = b.createElement(e); t.async = !0;
  t.src = v; s = b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t, s)
}(window, document, 'script',
  'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '345527236565069');
fbq('track', 'PageView');
`,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=345527236565069&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-TNHPH37N"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* ✅ Make language available everywhere (including /auth) */}
        <UiLanguageProvider>
          <DemoProvider>
            <FocusProvider>
              {/* Sticky Demo Banner */}
              <DemoBanner />

              <AppBoot>
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
                      <GlobalScreenRecorder />
                    </AppShell>
                  </RtlDirectionManager>
                </PlausibleProvider>

                {/* 🧩 Service worker (once) */}
                <ServiceWorkerRegister />
              </AppBoot>
            </FocusProvider>
          </DemoProvider>
        </UiLanguageProvider>

        {/* Google Tag Manager */}
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-TNHPH37N');
          `}
        </Script>

        {/* Google Tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17847132623"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'AW-17847132623');
gtag('config', 'G-WZVC2XYKQ9');
`}
        </Script>
        <Analytics />
      </body>
    </html>
  );
}
