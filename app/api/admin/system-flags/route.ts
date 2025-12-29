import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const ADMIN_KEY = process.env.ADMIN_KEY || "";

/**
 * We reuse the `ui_translations` table to store system flags.
 * Language code: 'system'
 * Key: 'feature.<flag_name>' (e.g. 'feature.video_recorder')
 * Text: 'true' | 'false'
 */

export async function GET(req: NextRequest) {
    try {
        const adminHeader = req.headers.get("X-Admin-Key") || "";
        // Optional: Allow public read if no admin key? 
        // For now, let's strictly require admin key for the Admin UI usage.
        // The frontend (GlobalScreenRecorder) might need a public way to read this.
        // Actually, for the recorder, we should probably allow public read or have a separate public endpoint.
        // But this is the ADMIN API.

        if (!ADMIN_KEY || adminHeader !== ADMIN_KEY) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const flag = searchParams.get("flag");

        if (!flag) {
            return NextResponse.json({ ok: false, error: "Missing flag name" }, { status: 400 });
        }

        const dbKey = `feature.${flag}`;

        const { data, error } = await supabaseAdmin
            .from("ui_translations")
            .select("text")
            .eq("language_code", "system")
            .eq("key", dbKey)
            .single();

        if (error && error.code !== "PGRST116") { // PGRST116 is "not found"
            console.error("Error fetching flag:", error);
            return NextResponse.json({ ok: false, error: "DB Error" }, { status: 500 });
        }

        // Default to true if not found/set? or false?
        // Let's say default is TRUE for video recorder if row missing.
        const isEnabled = data?.text !== "false";

        return NextResponse.json({ ok: true, enabled: isEnabled });

    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const adminHeader = req.headers.get("X-Admin-Key") || "";
        if (!ADMIN_KEY || adminHeader !== ADMIN_KEY) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { flag, enabled } = body;

        if (!flag || typeof enabled !== "boolean") {
            return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
        }

        const dbKey = `feature.${flag}`;
        const value = String(enabled);

        const { error } = await supabaseAdmin
            .from("ui_translations")
            .upsert({
                language_code: "system",
                key: dbKey,
                text: value
            }, { onConflict: "language_code,key" });

        if (error) {
            console.error("Error setting flag:", error);
            return NextResponse.json({ ok: false, error: "DB Error" }, { status: 500 });
        }

        return NextResponse.json({ ok: true, enabled });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}
