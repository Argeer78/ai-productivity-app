// app/api/test-email/route.ts
import { NextResponse } from "next/server";
import { sendTestEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Missing email" },
        { status: 400 }
      );
    }

    await sendTestEmail(email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[test-email] route error", err);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
