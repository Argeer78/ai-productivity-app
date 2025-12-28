
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

const NEW_KEYS = {
    "tools.calendar.name": "Calendar & Timeline",
    "tools.calendar.shortTagline": "See your notes, tasks, and AI chats in one view.",
    "tools.calendar.description": "The Calendar gives you a visual timeline of your work. It brings together your dated tasks, created notes, and AI conversations (Hub & Companion) so you can review your history or plan ahead.",
    "tools.calendar.bestFor1": "Reviewing what you worked on yesterday or last week",
    "tools.calendar.bestFor2": "Visualizing your workload (notes, tasks, AI chats) for the coming days",
    "tools.calendar.bestFor3": "Finding a specific conversation or note by date",
    "tools.calendar.cta": "Open Calendar",
    "tools.calendar.howToUse1": "Open the Calendar from the navigation to see a month view of your activity.",
    "tools.calendar.howToUse2": "Icons show you what happened each day: Tasks (✓), Notes (📝), AI Chat (🤖) and AI Companion (💛).",
    "tools.calendar.howToUse3": "Click any day to open the details panel and see exactly what you worked on.",
    "tools.calendar.howToUse4": "Use it to re-find ideas you lost or to see how consistent your habits are.",
    "tools.calendar.proHint": "Use the Calendar to review your AI Companion sessions and see how your mood or focus shifts over weeks."
};

async function main() {
    console.log("Syncing new Tools keys...");

    // 1. Insert EN keys
    for (const [key, text] of Object.entries(NEW_KEYS)) {
        const { error } = await supabase
            .from("ui_translations")
            .upsert({ key, language_code: "en", text }, { onConflict: "key,language_code" });

        if (error) console.error(`Failed to insert EN ${key}:`, error.message);
    }
    console.log("✅ EN keys inserted.");

    // 2. Translate for other languages
    const targets = SUPPORTED_LANGS.filter(l => l.code !== "en");

    for (const lang of targets) {
        process.stdout.write(`Translating for ${lang.code} (${lang.label})... `);

        const keysToTranslate = Object.entries(NEW_KEYS);

        // Batch translate
        const prompt = `Translate the following JSON values to ${lang.label} (${lang.code}). Keep keys unchanged. Return JSON only.
        ${JSON.stringify(NEW_KEYS, null, 2)}`;

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0,
            });

            const content = completion.choices[0]?.message?.content || "{}";
            const translatedMap = JSON.parse(content);

            const upsertData = Object.entries(translatedMap).map(([key, text]) => ({
                key,
                language_code: lang.code,
                text: typeof text === 'string' ? text : String(text)
            }));

            if (upsertData.length > 0) {
                const { error } = await supabase
                    .from("ui_translations")
                    .upsert(upsertData, { onConflict: "key,language_code" });

                if (error) console.log(`❌ DB Error: ${error.message}`);
                else console.log(`✅ Synced ${upsertData.length} keys.`);
            }

        } catch (e: any) {
            console.log(`❌ AI/Parse Error: ${e.message}`);
        }
    }
    console.log("Done!");
}

main();
