
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const json = await request.json();
        const { rating, comment, source } = json;

        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json(
                { error: "Invalid rating (must be 1-5)" },
                { status: 400 }
            );
        }

        // 1. Try to get current user ID (optional)
        let userId: string | null = null;
        try {
            const supabase = createRouteHandlerClient({ cookies });
            const { data } = await supabase.auth.getSession();
            userId = data?.session?.user?.id || null;
        } catch (authError) {
            console.warn("[reviews] Failed to get session:", authError);
            // Non-fatal: if auth fails (e.g. cookie issue), we just save as anonymous
        }

        // 2. Insert using Service Role (Bypasses RLS)
        // This ensures the write succeeds even if RLS policies are misconfigured or strict
        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );

        const { error } = await adminSupabase.from("app_reviews").insert({
            user_id: userId,
            rating,
            comment: comment?.trim() || null,
            source: source || "unknown",
        });

        if (error) {
            console.error("[reviews] insert error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("[reviews] fatal error:", e);
        return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        // Use admin client to ensure we can read all reviews even if RLS is strict
        // We will only return safe public fields
        if (!serviceKey || !dbUrl) {
            return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
        }

        const adminSupabase = createClient(dbUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data, error } = await adminSupabase
            .from("app_reviews")
            .select("id, rating, comment, user_id, created_at, source")
            .order("created_at", { ascending: false })
            .limit(50);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ reviews: data });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
