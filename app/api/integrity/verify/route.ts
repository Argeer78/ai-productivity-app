import { NextResponse } from "next/server";
import { google } from "googleapis";

const PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME!;
const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);

export async function POST(req: Request) {
  try {
    const { integrityToken } = await req.json();

    if (!integrityToken) {
      return NextResponse.json({ ok: false, reason: "missing_token" }, { status: 400 });
    }

    // Create Google auth client (server-side)
    const auth = new google.auth.GoogleAuth({
      credentials: SERVICE_ACCOUNT,
      scopes: ["https://www.googleapis.com/auth/playintegrity"],
    });

    // Create the API client
    const playintegrity = google.playintegrity("v1");

    // Call Google to decode/verify the token
    const res = await playintegrity.v1.decodeIntegrityToken({
      packageName: PACKAGE_NAME,
      requestBody: { integrityToken },
      auth, // pass GoogleAuth here
    });

    // ✅ FIX: correct property name
    const payload = res.data.tokenPayloadExternal;

    const appVerdict = payload?.appIntegrity?.appRecognitionVerdict;
    const deviceVerdicts = payload?.deviceIntegrity?.deviceRecognitionVerdict ?? [];

    const playRecognized = appVerdict === "PLAY_RECOGNIZED";
    const basicIntegrity = deviceVerdicts.includes("MEETS_BASIC_INTEGRITY");

    return NextResponse.json({ ok: true, playRecognized, basicIntegrity });
  } catch (e) {
    // Optional: log server-side for debugging
    // console.error(e);

    return NextResponse.json({ ok: false, reason: "verify_failed" }, { status: 500 });
  }
}
