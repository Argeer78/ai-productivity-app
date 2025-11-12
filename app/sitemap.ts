import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_APP_URL || "https://ai-productivity-app.vercel.app";

  const routes: MetadataRoute.Sitemap = [
    { url: `${base}/`, priority: 1.0 },
    { url: `${base}/pricing`, priority: 0.8 },
    { url: `${base}/legal/privacy`, priority: 0.3 },
    { url: `${base}/legal/terms`, priority: 0.3 },
    // Auth/feedback/settings are usually low/noindex, so we omit them.
  ];

  return routes;
}
