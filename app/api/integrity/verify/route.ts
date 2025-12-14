import { NextResponse } from "next/server";
import { google } from "googleapis";

const PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME;

export async function POST(req: Request) {
  try {
    if (!PACKAGE_NAME) {
      return NextResponse.json({ ok: false, reason: "missing_env_ANDROID_PACKAGE_NAME" }, { status: 500 });
    }

    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKeyRaw) {
      return NextResponse.json({ ok: false, reason: "missing_env_google_credentials" }, { status: 500 });
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

    const { integrityToken } = await req.json();
    if (!integrityToken) {
      return NextResponse.json({ ok: false, reason: "missing_token" }, { status: 400 });
    }

    const playintegrity = google.playintegrity("v1");

    const res = await playintegrity.v1.decodeIntegrityToken({
      packageName: PACKAGE_NAME,
      requestBody: { integrityToken },
      auth,
    });

    const payload = res.data.tokenPayloadExternal;

    const appVerdict = payload?.appIntegrity?.appRecognitionVerdict;
    const deviceVerdicts = payload?.deviceIntegrity?.deviceRecognitionVerdict ?? [];

    return NextResponse.json({
      ok: true,
      playRecognized: appVerdict === "PLAY_RECOGNIZED",
      basicIntegrity: deviceVerdicts.includes("MEETS_BASIC_INTEGRITY"),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: "verify_failed" }, { status: 500 });
  }
}
