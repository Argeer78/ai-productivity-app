import { NextResponse, type NextRequest } from "next/server";
import { adminAuthErrorResponse, requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * We reuse the `ui_translations` table to store system flags.
 * Language code: 'system'
 * Key: 'feature.<flag_name>' (e.g. 'feature.video_recorder')
 * Text: 'true' | 'false'
 */

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const flag = searchParams.get("flag");

        // Public whitelist: Flags that anyone can read
        const PUBLIC_FLAGS = ["video_recorder"];
        const isPublic = flag && PUBLIC_FLAGS.includes(flag);

        if (!isPublic) {
            const admin = await requireAdmin(req);
            const authError = adminAuthErrorResponse(admin);
            if (authError) return authError;
        }

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

    } catch (err) {
        console.error("Error fetching system flag:", err);
        return NextResponse.json({ ok: false, error: "Failed to fetch system flag" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const admin = await requireAdmin(req);
        const authError = adminAuthErrorResponse(admin);
        if (authError) return authError;

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
    } catch (err) {
        console.error("Error setting system flag:", err);
        return NextResponse.json({ ok: false, error: "Failed to set system flag" }, { status: 500 });
    }
}
