// scripts/export-ui-translations.ts
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load env files explicitly (scripts do NOT automatically load Next.js env)
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

// Accept either naming style
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env."
  );
  console.error("cwd:", process.cwd());
  console.error("has SUPABASE_URL:", !!process.env.SUPABASE_URL);
  console.error(
    "has NEXT_PUBLIC_SUPABASE_URL:",
    !!process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  console.error(
    "has SUPABASE_SERVICE_ROLE_KEY:",
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Languages to export
const LANGS = [
  "en",
  "el",
  "es",
  "de",
  "fr",
  "it",
  "pt",
  "tr",
  "ru",
  "ro",
  "ar",
  "he",
  "zh",
  "ja",
  "id",
  "sr",
  "bg",
  "hu",
  "pl",
  "cs",
  "da",
  "sv",
  "nb",
  "nl",
  "tr",
  "ko",
];

async function exportLang(lang: string) {
  const { data, error } = await supabase
    .from("ui_translations")
    .select("key, text")
    .eq("language_code", lang)
    .order("key");

  if (error) {
    console.error(`❌ Failed to export ${lang}:`, error.message);
    return;
  }

  const map: Record<string, string> = {};
  for (const row of data || []) {
    const k = (row as any).key;
    const t = (row as any).text;
    if (typeof k !== "string") continue;
    if (typeof t !== "string") continue;
    map[k] = t;
  }

  const outDir = path.join(process.cwd(), "languages");
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, `${lang}.json`);
  fs.writeFileSync(outPath, JSON.stringify(map, null, 2), "utf8");

  console.log(`✅ Exported ${Object.keys(map).length} keys -> ${outPath}`);
}

async function main() {
  for (const lang of LANGS) {
    await exportLang(lang);
  }
}

main().catch((err) => {
  console.error("Export script error:", err);
  process.exit(1);
});
