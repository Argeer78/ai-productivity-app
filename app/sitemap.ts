// app/sitemap.ts
import type { MetadataRoute } from "next";
// 🔧 Adjust this import to match your existing admin client helper
// e.g. `import { supabaseAdmin } from "@/lib/supabaseAdmin";`
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://aiprod.app";

// If you already have a supabaseAdmin helper, use that instead of creating a client here.
// This is a simple example using env vars directly:

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 1) STATIC ROUTES (same as before, just grouped)
  const staticRoutes: MetadataRoute.Sitemap = [
    // Main marketing & core app pages
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/dashboard`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/daily-success`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/notes`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/tasks`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/planner`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/ai-chat`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/explore`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/my-trips`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/travel`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/templates`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/weekly-reports`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/weekly-history`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/feedback`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },

    // Auth & billing (optional)
    {
      url: `${BASE_URL}/auth`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/auth/reset`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/auth/update-password`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/billing/cancel`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/billing/success`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.2,
    },

    // Legal & policy
    {
      url: `${BASE_URL}/privacy-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/legal/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/legal/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/cookies`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/delete-account`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },

    // Marketing / info
    {
      url: `${BASE_URL}/changelog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  // 2) DYNAMIC ROUTES – Templates
  let templateRoutes: MetadataRoute.Sitemap = [];
  try {
    // 🔧 Adjust table/columns/filters to your real schema
    // Example assumes table "templates" with columns: id, is_public
    const { data: templates, error } = await supabase
      .from("templates")
      .select("id, updated_at")
      .eq("is_public", true);

    if (error) {
      console.error("Error fetching templates for sitemap:", error);
    } else if (templates) {
      templateRoutes = templates.map((t: any) => ({
        url: `${BASE_URL}/templates/${t.id}`,
        lastModified: t.updated_at ? new Date(t.updated_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
    }
  } catch (err) {
    console.error("Unexpected error fetching templates for sitemap:", err);
  }

  // 3) DYNAMIC ROUTES – Weekly reports
  let weeklyReportRoutes: MetadataRoute.Sitemap = [];
  try {
    // 🔧 Adjust table/columns/filters to your real schema
    // Example assumes table "weekly_reports" with columns: id, updated_at, is_public (or similar)
    const { data: reports, error } = await supabase
      .from("weekly_reports")
      .select("id, updated_at")
      .eq("is_public", true); // or filter however you want

    if (error) {
      console.error("Error fetching weekly_reports for sitemap:", error);
    } else if (reports) {
      weeklyReportRoutes = reports.map((r: any) => ({
        url: `${BASE_URL}/weekly-reports/${r.id}`,
        lastModified: r.updated_at ? new Date(r.updated_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
    }
  } catch (err) {
    console.error("Unexpected error fetching weekly_reports for sitemap:", err);
  }

  return [...staticRoutes, ...templateRoutes, ...weeklyReportRoutes];
}
