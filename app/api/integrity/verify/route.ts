import { NextResponse } from "next/server";
import { google } from "googleapis";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import {
  integrityTokenHash,
  MAX_INTEGRITY_TOKEN_LENGTH,
  validateIntegrityPayload,
} from "@/lib/playIntegrity";

const PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME;

export async function POST(req: Request) {
  try {
    const authenticated = await getAuthenticatedUser(req);
    if (!authenticated.user) {
      return NextResponse.json(
        { ok: false, reason: authenticated.error === "server_misconfigured" ? "authorization_unavailable" : "unauthorized" },
        { status: authenticated.error === "server_misconfigured" ? 500 : 401 }
      );
    }

    if (!PACKAGE_NAME) {
      return NextResponse.json({ ok: false, reason: "verification_unavailable" }, { status: 503 });
    }

    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKeyRaw) {
      return NextResponse.json({ ok: false, reason: "verification_unavailable" }, { status: 503 });
    }

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_INTEGRITY_TOKEN_LENGTH + 1_000) {
      return NextResponse.json({ ok: false, reason: "invalid_request" }, { status: 413 });
    }

    // Convert "\n" into real newlines for the private key
    const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/playintegrity"],
    });

    const body = await req.json().catch(() => null) as { integrityToken?: unknown } | null;
    const integrityToken = body?.integrityToken;
    if (typeof integrityToken !== "string" || !integrityToken || integrityToken.length > MAX_INTEGRITY_TOKEN_LENGTH) {
      return NextResponse.json({ ok: false, reason: "invalid_request" }, { status: 400 });
    }

    const playintegrity = google.playintegrity("v1");

    const res = await playintegrity.v1.decodeIntegrityToken({
      packageName: PACKAGE_NAME,
      requestBody: { integrityToken },
      auth,
    });

    const payload = res.data.tokenPayloadExternal;
    const verdict = validateIntegrityPayload(payload, PACKAGE_NAME, authenticated.user.id);
    if (!verdict.ok) {
      return NextResponse.json({ ok: false, reason: verdict.reason }, { status: 403 });
    }

    const { error: replayError } = await supabaseAdmin
      .from("play_integrity_verifications")
      .insert({ token_hash: integrityTokenHash(integrityToken), user_id: authenticated.user.id });

    if (replayError) {
      if (replayError.code === "23505") {
        return NextResponse.json({ ok: false, reason: "token_replayed" }, { status: 409 });
      }
      console.error("[integrity] failed to record verification", replayError);
      return NextResponse.json({ ok: false, reason: "verification_unavailable" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      playRecognized: true,
      basicIntegrity: verdict.basicIntegrity,
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "verify_failed" }, { status: 500 });
  }
}
