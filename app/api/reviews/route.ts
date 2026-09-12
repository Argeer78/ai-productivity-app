
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
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

        const { error } = await supabaseAdmin.from("app_reviews").insert({
            user_id: userId,
            rating,
            comment: comment?.trim() || null,
            source: source || "unknown",
        });

        if (error) {
            console.error("[reviews] insert error:", error);
            return NextResponse.json({ error: "Unable to save review" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch {
        console.error("[reviews] request failed");
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from("app_reviews")
            .select("id, rating, comment, created_at, source")
            .order("created_at", { ascending: false })
            .limit(50);

        if (error) {
            console.error("[reviews] public list query failed");
            return NextResponse.json({ error: "Unable to load reviews" }, { status: 500 });
        }

        return NextResponse.json({
            reviews: (data || []).map((review) => ({ ...review, verified: true })),
        });

    } catch {
        console.error("[reviews] public list request failed");
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
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

        const { error } = await supabaseAdmin.from("app_reviews").delete().eq("id", id);

        if (error) {
            console.error("[reviews] delete query failed");
            return NextResponse.json({ error: "Unable to delete review" }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch {
        console.error("[reviews] delete request failed");
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
