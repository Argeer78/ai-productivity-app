
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { SUPPORTED_LANGS } from "../lib/i18n";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
    console.log("Syncing 'nav.calendar' key...");

    // 1. Insert EN
    const key = "nav.calendar";
    const enText = "Calendar";

    console.log(`Upserting EN: ${key} = ${enText}`);
    const { error: enErr } = await supabase
        .from("ui_translations")
        .upsert({ key, language_code: "en", text: enText }, { onConflict: "key,language_code" });

    if (enErr) {
        console.error("Error upserting EN:", enErr);
        return;
    }

    // 2. Translate and Insert for others
    const targets = SUPPORTED_LANGS.filter(l => l.code !== "en");

    for (const lang of targets) {
        process.stdout.write(`Syncing ${lang.code} (${lang.label})... `);

        try {
            const prompt = `Translate the single word "Calendar" (navigation menu item) to ${lang.label} (${lang.code}). Return ONLY the translated string, no quotes, no extra text.`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
                temperature: 0,
            });

            let translated = completion.choices[0]?.message?.content?.trim() || "Calendar";

            // Cleanup quotes if AI added them
            if (translated.startsWith('"') && translated.endsWith('"')) {
                translated = translated.slice(1, -1);
            }

            const { error: upErr } = await supabase
                .from("ui_translations")
                .upsert({ key, language_code: lang.code, text: translated }, { onConflict: "key,language_code" });

            if (upErr) {
                console.log(`❌ DB Error: ${upErr.message}`);
            } else {
                console.log(`✅ ${translated}`);
            }

        } catch (e: any) {
            console.log(`❌ Error: ${e.message}`);
        }
    }
    console.log("Done!");
}

main();
