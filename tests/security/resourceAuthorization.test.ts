import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "@supabase/supabase-js";
import { authorizeOwnedResource } from "../../lib/resourceAuthorization";

const user = { id: "11111111-1111-4111-8111-111111111111" } as User;

test("logged-out resource request returns 401", async () => {
  const result = await authorizeOwnedResource(
    { user: null, error: "missing_token" },
    async () => ({ id: "resource" })
  );

  assert.equal(result.status, 401);
});

test("owned resource request returns the resource", async () => {
  const result = await authorizeOwnedResource(
    { user, error: null },
    async (userId) => userId === user.id ? { id: "resource" } : null
  );

  assert.equal(result.status, 200);
  assert.equal(result.resource?.id, "resource");
});

test("cross-user resource request returns 404", async () => {
  const result = await authorizeOwnedResource(
    { user, error: null },
    async () => null
  );

  assert.equal(result.status, 404);
  assert.equal(result.error, "Not found");
});

test("resource lookup failure is controlled", async () => {
  const result = await authorizeOwnedResource(
    { user, error: null },
    async () => {
      throw new Error("database unavailable");
    }
  );

  assert.equal(result.status, 500);
  assert.equal(result.error, "Authorization unavailable");
});