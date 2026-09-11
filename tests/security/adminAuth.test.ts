import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "@supabase/supabase-js";
import { authorizeAdminIdentity } from "../../lib/adminAuthorization";

const user = { id: "11111111-1111-4111-8111-111111111111" } as User;

test("logged-out admin request returns 401", async () => {
  const result = await authorizeAdminIdentity(
    { user: null, error: "missing_token" },
    async () => false
  );

  assert.equal(result.status, 401);
  assert.equal(result.error, "Unauthorized");
});

test("authenticated non-admin request returns 403", async () => {
  const result = await authorizeAdminIdentity({ user, error: null }, async () => false);

  assert.equal(result.status, 403);
  assert.equal(result.error, "Forbidden");
});

test("authenticated admin request is allowed", async () => {
  const result = await authorizeAdminIdentity({ user, error: null }, async () => true);

  assert.equal(result.status, 200);
  assert.equal(result.user?.id, user.id);
});

test("authorization infrastructure failure is controlled", async () => {
  const result = await authorizeAdminIdentity(
    { user, error: null },
    async () => {
      throw new Error("database unavailable");
    }
  );

  assert.equal(result.status, 500);
  assert.equal(result.error, "Admin authorization unavailable");
});