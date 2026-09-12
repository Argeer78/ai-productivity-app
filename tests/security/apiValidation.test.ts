import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { parseJsonBody, parseQuery, readBoundedText } from "../../lib/apiValidation";

const schema = z.object({
  id: z.uuid(),
  mode: z.enum(["brief", "full"]),
  enabled: z.boolean(),
  count: z.number().int().min(1).max(5),
  text: z.string().trim().min(1).max(20),
  tags: z.array(z.string().max(8)).max(3).optional(),
}).strict();

test("bounded JSON validation accepts valid input", async () => {
  const body = { id: "11111111-1111-4111-8111-111111111111", mode: "brief", enabled: true, count: 2, text: "hello" };
  const result = await parseJsonBody(new Request("https://example.test", { method: "POST", body: JSON.stringify(body) }), schema);
  assert.equal(result.ok, true);
});

test("malformed and missing JSON fields return controlled 400 responses", async () => {
  const malformed = await parseJsonBody(new Request("https://example.test", { method: "POST", body: "{" }), schema);
  const missing = await parseJsonBody(new Request("https://example.test", { method: "POST", body: "{}" }), schema);
  assert.equal(malformed.ok, false);
  assert.equal(malformed.ok ? 0 : malformed.response.status, 400);
  assert.equal(missing.ok ? 0 : missing.response.status, 400);
});

test("invalid UUID, enum, type, and oversized text are rejected", async () => {
  const body = { id: "bad", mode: "other", enabled: "yes", count: 9, text: "x".repeat(21) };
  const result = await parseJsonBody(new Request("https://example.test", { method: "POST", body: JSON.stringify(body) }), schema);
  assert.equal(result.ok, false);
  assert.equal(result.ok ? 0 : result.response.status, 400);
});

test("body byte limits reject declared and actual oversized payloads", async () => {
  const declared = await parseJsonBody(new Request("https://example.test", { method: "POST", headers: { "content-length": "100" }, body: "{}" }), schema, 10);
  const actual = await parseJsonBody(new Request("https://example.test", { method: "POST", body: JSON.stringify({ text: "large" }) }), schema, 5);
  assert.equal(declared.ok ? 0 : declared.response.status, 413);
  assert.equal(actual.ok ? 0 : actual.response.status, 413);
});

test("query validation uses the same schema contract", () => {
  const querySchema = z.object({ active: z.enum(["true", "false"]), page: z.coerce.number().int().min(1).max(10) });
  assert.equal(parseQuery(new Request("https://example.test?active=true&page=2"), querySchema).ok, true);
  assert.equal(parseQuery(new Request("https://example.test?active=maybe&page=99"), querySchema).ok, false);
});

test("raw webhook bodies enforce actual byte limits", async () => {
  const result = await readBoundedText(new Request("https://example.test", { method: "POST", body: "éé" }), 3);
  assert.equal(result.ok, false);
  assert.equal(result.ok ? 0 : result.response.status, 413);
});
