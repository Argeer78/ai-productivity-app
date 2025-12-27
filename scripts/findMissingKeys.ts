
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { throw new Error("Missing env vars"); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function getAllKeys(lang: string) {
    const keys = new Set<string>();
    const emptyKeys: string[] = [];
    let from = 0;
    const size = 1000;
    while (true) {
        const { data, error } = await supabase
            .from('ui_translations')
            .select('key, text')
            .eq('language_code', lang)
            .range(from, from + size - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        data.forEach(r => {
            keys.add(r.key);
            if (!r.text || r.text.trim() === "") {
                emptyKeys.push(r.key);
            }
        });
        if (data.length < size) break;
        from += size;
    }
    return { keys, emptyKeys };
}

async function run() {
    console.log("Fetching EN keys...");
    const { keys: enKeys } = await getAllKeys('en');
    console.log(`EN Count: ${enKeys.size}`);

    console.log("Fetching EL keys...");
    const { keys: elKeys, emptyKeys: elEmpty } = await getAllKeys('el');
    console.log(`EL Count: ${elKeys.size}`);
    console.log(`EL Empty/Null Count: ${elEmpty.length}`);
    if (elEmpty.length > 0) {
        console.log("Empty Examples:", elEmpty.slice(0, 5));
    }

    const missing = [...enKeys].filter(k => !elKeys.has(k));
    console.log(`MISSING KEYS (Not in DB): ${missing.length}`);
    if (missing.length > 0) {
        console.log("Missing Examples:", missing.slice(0, 5));
        missing.slice(0, 20).forEach(k => console.log(`- ${k}`));
    }
}

run();
