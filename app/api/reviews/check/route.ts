
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ hasReviewed: false });
        }

        // Check app_reviews table
        const { count, error } = await supabase
            .from("app_reviews")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);

        if (error) {
            console.error("Check review error:", error);
            // Fallback to false so we don't break UI, or true to be safe? 
            // False is safer to avoid blocking legitimately, but might annoy. 
            // Let's return false.
            return NextResponse.json({ hasReviewed: false });
        }

        return NextResponse.json({ hasReviewed: (count || 0) > 0 });

    } catch (e) {
        console.error("Check review fatal:", e);
        return NextResponse.json({ hasReviewed: false });
    }
}
