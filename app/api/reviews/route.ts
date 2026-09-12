
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, parseQuery, REQUEST_LIMITS } from "@/lib/apiValidation";
import { enforceAuthenticatedRateLimit } from "@/lib/rateLimit";
import { adminAuthErrorResponse, requireAdmin } from "@/lib/adminAuth";
import { getAuthenticatedUser } from "@/lib/serverAuth";

const createReviewSchema = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(2_000).optional(),
    source: z.string().trim().max(100).optional(),
}).strict();
const deleteReviewSchema = z.object({ id: z.uuid() }).strict();

export async function POST(request: Request) {
    try {
        const auth = await getAuthenticatedUser(request);
        if (!auth.user) return NextResponse.json({ error: "Authentication required" }, { status: auth.error === "server_misconfigured" ? 500 : 401 });
        const parsedBody = await parseJsonBody(request, createReviewSchema, REQUEST_LIMITS.smallJson);
        if (!parsedBody.ok) return parsedBody.response;
        const { rating, comment, source } = parsedBody.data;
        const userId = auth.user.id;
        const rateLimit = await enforceAuthenticatedRateLimit(userId, "reviews:create", "authenticated-standard");
        if (!rateLimit.ok) return rateLimit.response;

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
        const admin = await requireAdmin(request);
        const authError = adminAuthErrorResponse(admin);
        if (authError) return authError;

        if (!admin.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const parsedQuery = parseQuery(request, deleteReviewSchema);
        if (!parsedQuery.ok) return parsedQuery.response;
        const { id } = parsedQuery.data;
        const rateLimit = await enforceAuthenticatedRateLimit(admin.user.id, "admin:reviews-delete", "admin");
        if (!rateLimit.ok) return rateLimit.response;

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
