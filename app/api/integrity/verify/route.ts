import { NextResponse } from "next/server";
import { google } from "googleapis";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import { z } from "zod";
import { parseJsonBody } from "@/lib/apiValidation";
import {
  integrityTokenHash,
  MAX_INTEGRITY_TOKEN_LENGTH,
  validateIntegrityPayload,
} from "@/lib/playIntegrity";

const PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME;
const requestSchema = z.object({ integrityToken: z.string().min(1).max(MAX_INTEGRITY_TOKEN_LENGTH) }).strict();

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

    // Convert "\n" into real newlines for the private key
    const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/playintegrity"],
    });

    const parsedBody = await parseJsonBody(req, requestSchema, MAX_INTEGRITY_TOKEN_LENGTH + 1_000);
    if (!parsedBody.ok) return parsedBody.response;
    const { integrityToken } = parsedBody.data;

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
