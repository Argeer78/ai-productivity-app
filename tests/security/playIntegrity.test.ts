import assert from "node:assert/strict";
import test from "node:test";
import { integrityRequestHash, integrityTokenHash, validateIntegrityPayload } from "../../lib/playIntegrity";

const userId = "11111111-1111-4111-8111-111111111111";
const packageName = "app.aiprod";
const now = 1_800_000_000_000;

function payload(overrides: Record<string, unknown> = {}) {
  return {
    requestDetails: {
      requestPackageName: packageName,
      requestHash: integrityRequestHash(userId),
      timestampMillis: String(now),
    },
    appIntegrity: { appRecognitionVerdict: "PLAY_RECOGNIZED" },
    deviceIntegrity: { deviceRecognitionVerdict: ["MEETS_BASIC_INTEGRITY"] },
    ...overrides,
  };
}

test("integrity payload is bound to the authenticated user", () => {
  assert.equal(validateIntegrityPayload(payload(), packageName, userId, now).ok, true);
  assert.deepEqual(validateIntegrityPayload(payload(), packageName, "22222222-2222-4222-8222-222222222222", now), {
    ok: false,
    reason: "request_mismatch",
  });
});

test("integrity payload rejects wrong package and stale tokens", () => {
  assert.equal(validateIntegrityPayload(payload(), "other.package", userId, now).ok, false);
  const stale = payload({ requestDetails: { ...payload().requestDetails, timestampMillis: String(now - 120_001) } });
  assert.deepEqual(validateIntegrityPayload(stale, packageName, userId, now), { ok: false, reason: "stale_token" });
});

test("integrity payload rejects an unrecognized app", () => {
  const result = validateIntegrityPayload(
    payload({ appIntegrity: { appRecognitionVerdict: "UNRECOGNIZED_VERSION" } }),
    packageName,
    userId,
    now
  );
  assert.deepEqual(result, { ok: false, reason: "app_unrecognized" });
});

test("integrity token hashes are stable without retaining tokens", () => {
  assert.equal(integrityTokenHash("token"), integrityTokenHash("token"));
  assert.notEqual(integrityTokenHash("token"), integrityTokenHash("other"));
  assert.equal(integrityTokenHash("token").length, 64);
});