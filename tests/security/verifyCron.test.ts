import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { verifyCronAuth } from "../../lib/verifyCron";

const originalCronSecret = process.env.CRON_SECRET;

test.after(() => {
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalCronSecret;
});

test("cron authentication fails closed when unconfigured", () => {
  delete process.env.CRON_SECRET;
  const response = verifyCronAuth(new NextRequest("https://example.test/api/cron"));
  assert.equal(response?.status, 500);
});

test("cron authentication rejects missing and invalid bearer tokens", () => {
  process.env.CRON_SECRET = "test-cron-secret";
  const missing = verifyCronAuth(new NextRequest("https://example.test/api/cron"));
  const invalid = verifyCronAuth(new NextRequest("https://example.test/api/cron", {
    headers: { authorization: "Bearer wrong-secret" },
  }));

  assert.equal(missing?.status, 401);
  assert.equal(invalid?.status, 401);
});

test("cron authentication accepts the configured bearer token", () => {
  process.env.CRON_SECRET = "test-cron-secret";
  const response = verifyCronAuth(new NextRequest("https://example.test/api/cron", {
    headers: { authorization: "Bearer test-cron-secret" },
  }));

  assert.equal(response, null);
});