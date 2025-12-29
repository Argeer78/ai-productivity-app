
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

        // 1. Get current user ID via Authorization Header
        // (Since the client uses localStorage and not cookies, we must read the bearer token)
        console.log("[reviews] Starting auth check...");
        let userId: string | undefined;

        try {
            const authHeader = request.headers.get("Authorization");
            if (authHeader) {
                const token = authHeader.replace("Bearer ", "");

                const supabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                    { auth: { persistSession: false } }
                );

                const { data: { user }, error: userError } = await supabase.auth.getUser(token);

                if (userError) {
                    console.warn("[reviews] Token validation failed:", userError);
                }

                userId = user?.id;
                console.log("[reviews] User ID found:", userId);
            } else {
                console.warn("[reviews] No Authorization header found");
            }

        } catch (authError: any) {
            console.error("[reviews] Auth Check Failed:", authError);
            // Return 500 only if system failed hard, otherwise 401 later
        }

        if (!userId) {
            console.log("[reviews] No user ID, returning 401");
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
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

export async function DELETE(request: Request) {
    try {
        // 1. Verify Admin via Header Token (Client passes session token)
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.replace("Bearer ", "");
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user } } = await supabase.auth.getUser(token);

        // Load admin email from env
        const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

        if (!user || !ADMIN_EMAIL || user.email !== ADMIN_EMAIL) {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
        }

        // 2. Get ID to delete
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        // 3. Delete using Service Role (Bypasses RLS)
        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        const { error } = await adminSupabase.from("app_reviews").delete().eq("id", id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
