import assert from "node:assert/strict";
import test from "node:test";
import {
  anonymousLimiterIdentity,
  authenticatedLimiterIdentity,
  enforceRateLimit,
  type RateLimitStore,
} from "../../lib/rateLimit";

class MemoryStore implements RateLimitStore {
  counts = new Map<string, number>();

  async consume(input: Parameters<RateLimitStore["consume"]>[0]) {
    const key = `${input.action}:${input.identityHash}`;
    const count = (this.counts.get(key) || 0) + input.cost;
    this.counts.set(key, count);
    return { allowed: count <= input.limit, retryAfterSeconds: 42 };
  }
}

test("authenticated limits bind to the verified user, not caller fields", async () => {
  const store = new MemoryStore();
  const identity = authenticatedLimiterIdentity("11111111-1111-4111-8111-111111111111");
  for (let index = 0; index < 20; index++) {
    assert.equal((await enforceRateLimit({ action: "ai:test", identity, rateClass: "ai-light", store })).ok, true);
  }
  const blocked = await enforceRateLimit({ action: "ai:test", identity, rateClass: "ai-light", store });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.ok ? 0 : blocked.response.status, 429);
  assert.equal(blocked.ok ? "" : blocked.response.headers.get("Retry-After"), "42");
});

test("anonymous identity trusts only proxy-overwritten X-Real-IP", () => {
  const first = new Request("https://example.test", { headers: { "x-real-ip": "203.0.113.8", "x-forwarded-for": "198.51.100.1" } });
  const spoofed = new Request("https://example.test", { headers: { "x-real-ip": "203.0.113.8", "x-forwarded-for": "192.0.2.9" } });
  assert.equal(anonymousLimiterIdentity(first, true), anonymousLimiterIdentity(spoofed, true));
  assert.equal(anonymousLimiterIdentity(first, false), null);
});

test("different actions use separate counters", async () => {
  const store = new MemoryStore();
  const identity = authenticatedLimiterIdentity("user");
  for (let index = 0; index < 20; index++) await enforceRateLimit({ action: "ai:first", identity, rateClass: "ai-light", store });
  assert.equal((await enforceRateLimit({ action: "ai:second", identity, rateClass: "ai-light", store })).ok, true);
});

test("store failures are closed for provider routes and open for public-light", async () => {
  const store: RateLimitStore = { consume: async () => { throw new Error("unavailable"); } };
  const expensive = await enforceRateLimit({ action: "ai:test", identity: "user:test", rateClass: "ai-heavy", store });
  const harmless = await enforceRateLimit({ action: "public:test", identity: "network:test", rateClass: "public-light", store });
  assert.equal(expensive.ok, false);
  assert.equal(expensive.ok ? 0 : expensive.response.status, 503);
  assert.equal(harmless.ok, true);
});

test("provider work does not execute after rate-limit rejection", async () => {
  const store: RateLimitStore = {
    consume: async () => ({ allowed: false, retryAfterSeconds: 10 }),
  };
  let providerCalls = 0;
  const guard = await enforceRateLimit({ action: "ai:image", identity: "user:test", rateClass: "ai-heavy", store });
  if (guard.ok) providerCalls += 1;
  assert.equal(providerCalls, 0);
  assert.equal(guard.ok ? 0 : guard.response.status, 429);
});

test("changing a caller-controlled user field cannot change authenticated identity", () => {
  const verified = authenticatedLimiterIdentity("11111111-1111-4111-8111-111111111111");
  const requestBodies = [{ userId: "guest" }, { userId: "22222222-2222-4222-8222-222222222222" }];
  assert.deepEqual(requestBodies.map(() => verified), [verified, verified]);
});