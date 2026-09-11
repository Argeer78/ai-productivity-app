import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/adminAuth";
import { getAuthenticatedUser } from "@/lib/serverAuth";

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);

  if (!auth.user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: auth.error === "server_misconfigured" ? 500 : 401 }
    );
  }

  try {
    return NextResponse.json({ ok: true, admin: await isAdminUser(auth.user.id) });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Authorization unavailable" },
      { status: 500 }
    );
  }
}