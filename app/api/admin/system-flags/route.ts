import { NextResponse, type NextRequest } from "next/server";
import { adminAuthErrorResponse, requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";
import { parseJsonBody, parseQuery, REQUEST_LIMITS } from "@/lib/apiValidation";

export const runtime = "nodejs";
const flagSchema = z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/);

/**
 * We reuse the `ui_translations` table to store system flags.
 * Language code: 'system'
 * Key: 'feature.<flag_name>' (e.g. 'feature.video_recorder')
 * Text: 'true' | 'false'
 */

export async function GET(req: NextRequest) {
    try {
        const parsedQuery = parseQuery(req, z.object({ flag: flagSchema }).strict());
        if (!parsedQuery.ok) return parsedQuery.response;
        const { flag } = parsedQuery.data;

        // Public whitelist: Flags that anyone can read
        const PUBLIC_FLAGS = ["video_recorder"];
        const isPublic = flag && PUBLIC_FLAGS.includes(flag);

        if (!isPublic) {
            const admin = await requireAdmin(req);
            const authError = adminAuthErrorResponse(admin);
            if (authError) return authError;
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

        const parsedBody = await parseJsonBody(req, z.object({ flag: flagSchema, enabled: z.boolean() }).strict(), REQUEST_LIMITS.smallJson);
        if (!parsedBody.ok) return parsedBody.response;
        const { flag, enabled } = parsedBody.data;

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
