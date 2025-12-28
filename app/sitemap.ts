// app/sitemap.ts
import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BASE_URL = "https://aiprod.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 1) Static routes
  const routes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now },
    { url: `${BASE_URL}/dashboard`, lastModified: now },
    { url: `${BASE_URL}/daily-success`, lastModified: now },
    { url: `${BASE_URL}/pricing`, lastModified: now },
    { url: `${BASE_URL}/tools`, lastModified: now },
    { url: `${BASE_URL}/ai-task-creator`, lastModified: now },
    { url: `${BASE_URL}/checklist-generator`, lastModified: now },
    { url: `${BASE_URL}/notes`, lastModified: now },
    { url: `${BASE_URL}/tasks`, lastModified: now },
    { url: `${BASE_URL}/planner`, lastModified: now },
    { url: `${BASE_URL}/ai-chat`, lastModified: now },
    { url: `${BASE_URL}/explore`, lastModified: now },
    { url: `${BASE_URL}/my-trips`, lastModified: now },
    { url: `${BASE_URL}/travel`, lastModified: now },
    { url: `${BASE_URL}/templates`, lastModified: now },
    { url: `${BASE_URL}/weekly-reports`, lastModified: now },
    { url: `${BASE_URL}/weekly-history`, lastModified: now },
    { url: `${BASE_URL}/about`, lastModified: now },
    { url: `${BASE_URL}/contact`, lastModified: now },
    { url: `${BASE_URL}/feedback`, lastModified: now },
    { url: `${BASE_URL}/auth`, lastModified: now },
    { url: `${BASE_URL}/privacy-policy`, lastModified: now },
    { url: `${BASE_URL}/terms`, lastModified: now },
    { url: `${BASE_URL}/cookies`, lastModified: now },
    { url: `${BASE_URL}/delete-account`, lastModified: now },
    { url: `${BASE_URL}/changelog`, lastModified: now },
  ];

  // 2) Dynamic public templates (created_at, not updated_at)
  try {
    const { data: templates, error } = await supabaseAdmin
      .from("templates")
      .select("id, created_at, is_public")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching templates for sitemap:", error);
    } else if (templates) {
      for (const t of templates) {
        routes.push({
          url: `${BASE_URL}/templates/${t.id}`,
          lastModified: t.created_at ? new Date(t.created_at) : now,
        });
      }
    }
  } catch (err) {
    console.error("Exception while building template routes for sitemap:", err);
  }

  // ✅ No weekly_reports query at all now

  return routes;
}
