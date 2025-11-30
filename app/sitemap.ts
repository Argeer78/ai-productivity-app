// app/sitemap.ts
import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BASE_URL = "https://aiprod.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: new Date() },
    { url: `${BASE_URL}/dashboard`, lastModified: new Date() },
    { url: `${BASE_URL}/daily-success`, lastModified: new Date() },
    { url: `${BASE_URL}/notes`, lastModified: new Date() },
    { url: `${BASE_URL}/tasks`, lastModified: new Date() },
    { url: `${BASE_URL}/planner`, lastModified: new Date() },
    { url: `${BASE_URL}/ai-chat`, lastModified: new Date() },
    { url: `${BASE_URL}/explore`, lastModified: new Date() },
    { url: `${BASE_URL}/my-trips`, lastModified: new Date() },
    { url: `${BASE_URL}/travel`, lastModified: new Date() },
    { url: `${BASE_URL}/templates`, lastModified: new Date() },
    { url: `${BASE_URL}/weekly-reports`, lastModified: new Date() },
    { url: `${BASE_URL}/weekly-history`, lastModified: new Date() },
    { url: `${BASE_URL}/feedback`, lastModified: new Date() },
    { url: `${BASE_URL}/auth`, lastModified: new Date() },
    { url: `${BASE_URL}/privacy-policy`, lastModified: new Date() },
    { url: `${BASE_URL}/terms`, lastModified: new Date() },
    { url: `${BASE_URL}/cookies`, lastModified: new Date() },
    { url: `${BASE_URL}/delete-account`, lastModified: new Date() },
    { url: `${BASE_URL}/changelog`, lastModified: new Date() },
  ];

  try {
    const { data: templates } = await supabaseAdmin
      .from("templates")
      .select("id, created_at, is_public")
      .eq("is_public", true)
      .limit(100);

    if (templates) {
      for (const t of templates) {
        routes.push({
          url: `${BASE_URL}/templates/${t.id}`,
          lastModified: new Date(t.created_at),
        });
      }
    }
  } catch (err) {
    console.error("Error fetching templates for sitemap:", err);
  }

  return routes;
}
