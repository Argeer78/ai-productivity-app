// app/api/integrity/verify/route.ts
import { NextResponse } from "next/server";
import { playintegrity } from "@googleapis/playintegrity";
import { GoogleAuth } from "google-auth-library";

const PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME!;
// Store the service account JSON (stringified) in Vercel env:
// GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);

export async function POST(req: Request) {
  try {
    const { integrityToken } = await req.json();

    if (!integrityToken) {
      return NextResponse.json({ ok: false, reason: "missing_token" }, { status: 400 });
    }

    // Auth with Play Integrity scope
    const auth = new GoogleAuth({
      credentials: SERVICE_ACCOUNT,
      scopes: ["https://www.googleapis.com/auth/playintegrity"],
    });

    const client = await auth.getClient();
    const api = playintegrity({ version: "v1", auth: client });

    // Calls Google's servers to decode/verify the token
    const res = await api.v1.decodeIntegrityToken({
      packageName: PACKAGE_NAME,
      requestBody: { integrityToken },
    });

    const payload = res.data.tokenPayloadExternalData;

    // Minimal “monitor-mode” checks (start lenient)
    const appVerdict = payload?.appIntegrity?.appRecognitionVerdict;
    const deviceVerdicts = payload?.deviceIntegrity?.deviceRecognitionVerdict ?? [];

    const playRecognized = appVerdict === "PLAY_RECOGNIZED";
    const basicIntegrity = deviceVerdicts.includes("MEETS_BASIC_INTEGRITY");

    return NextResponse.json({
      ok: true,
      playRecognized,
      basicIntegrity,
      // Return only what you need; don’t echo full payload to clients in production.
    });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: "verify_failed" }, { status: 500 });
  }
}
