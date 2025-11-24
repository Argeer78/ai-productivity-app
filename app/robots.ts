import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://aiprod.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Block internal/sensitive stuff from indexing:
      disallow: [
        "/auth",
        "/api/",
        "/admin",
        "/billing",
        "/settings",
        "/feedback", // optional
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
