// app/api/test-email/route.ts
import { NextResponse } from "next/server";
import { sendTestEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body?.email as string | undefined;

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Missing email" },
        { status: 400 }
      );
    }

    const success = await sendTestEmail(email);

    if (!success) {
      return NextResponse.json(
        { ok: false, error: "Failed to send test email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[test-email] route error", err);
    return NextResponse.json(
      { ok: false, error: "Server error while sending test email" },
      { status: 500 }
    );
  }
}
