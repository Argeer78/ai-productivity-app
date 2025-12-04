import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// ✅ Same env var here too
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

type UserStats = {
  notesCount: number;
  tasksCount: number;
  tripsCount: number;
  totalAiCalls: number;
  lastAiDate: string | null;
};

export async function GET(req: Request) {
  const headerKey = req.headers.get("x-admin-key") || "";

  if (!ADMIN_KEY) {
    console.error("[admin/users/:id] NEXT_PUBLIC_ADMIN_KEY is not set");
    return NextResponse.json(
      { ok: false, error: "Admin key is not configured on the server." },
      { status: 500 }
    );
  }

  if (headerKey !== ADMIN_KEY) {
    console.warn("[admin/users/:id] Unauthorized request");
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const userId = segments[segments.length - 1];

  if (!userId || userId === "undefined") {
    console.error("[admin/users/:id] Invalid userId:", userId);
    return NextResponse.json(
      { ok: false, error: "Invalid or missing user id in URL." },
      { status: 400 }
    );
  }

  try {
    // ... (rest of your logic stays the same)
  } catch (err: any) {
    console.error("[admin/users/:id] Unexpected error", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unexpected server error in admin user route.",
      },
      { status: 500 }
    );
  }
}
