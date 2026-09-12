import { createHash, timingSafeEqual } from "node:crypto";

export const MAX_INTEGRITY_TOKEN_LENGTH = 20_000;
export const MAX_INTEGRITY_AGE_MS = 2 * 60 * 1000;

type IntegrityPayload = {
  requestDetails?: {
    requestPackageName?: string | null;
    requestHash?: string | null;
    timestampMillis?: string | null;
  } | null;
  appIntegrity?: { appRecognitionVerdict?: string | null } | null;
  deviceIntegrity?: { deviceRecognitionVerdict?: string[] | null } | null;
};

export function integrityRequestHash(userId: string): string {
  return createHash("sha256").update(`aiprod-integrity:${userId}`, "utf8").digest("base64url");
}

export function integrityTokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function hashesEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function validateIntegrityPayload(
  payload: IntegrityPayload | null | undefined,
  packageName: string,
  userId: string,
  now = Date.now()
): { ok: true; basicIntegrity: boolean } | { ok: false; reason: string } {
  const details = payload?.requestDetails;
  const timestamp = Number(details?.timestampMillis);

  if (details?.requestPackageName !== packageName) return { ok: false, reason: "package_mismatch" };
  if (!details?.requestHash || !hashesEqual(details.requestHash, integrityRequestHash(userId))) {
    return { ok: false, reason: "request_mismatch" };
  }
  if (!Number.isFinite(timestamp) || timestamp > now + 30_000 || now - timestamp > MAX_INTEGRITY_AGE_MS) {
    return { ok: false, reason: "stale_token" };
  }
  if (payload?.appIntegrity?.appRecognitionVerdict !== "PLAY_RECOGNIZED") {
    return { ok: false, reason: "app_unrecognized" };
  }

  const deviceVerdicts = payload?.deviceIntegrity?.deviceRecognitionVerdict ?? [];
  return { ok: true, basicIntegrity: deviceVerdicts.includes("MEETS_BASIC_INTEGRITY") };
}