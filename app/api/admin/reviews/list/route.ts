import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
    try {
        const admin = await requireAdmin(request);
        const authError = adminAuthErrorResponse(admin);
        if (authError) return authError;

        const { data, error } = await supabaseAdmin
            .from("app_reviews")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("[admin/reviews] query failed", error.message);
            return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
        }

        return NextResponse.json({ reviews: data });

    } catch (e: any) {
        console.error("[admin/reviews] unexpected error", e);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
