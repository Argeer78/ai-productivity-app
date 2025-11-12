import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_APP_URL || "https://ai-productivity-app.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Block auth & API routes from indexing:
      disallow: ["/auth", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
