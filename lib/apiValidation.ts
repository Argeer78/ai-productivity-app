import { z } from "zod";

export const REQUEST_LIMITS = {
  smallJson: 32 * 1024,
  aiTextJson: 256 * 1024,
  webhook: 1024 * 1024,
  voiceUpload: 11 * 1024 * 1024,
} as const;

type ValidationSuccess<T> = { ok: true; data: T };
type ValidationFailure = { ok: false; response: Response };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

function errorResponse(status: 400 | 413, code: "invalid_request" | "payload_too_large") {
  return Response.json(
    { ok: false, error: { code, message: status === 413 ? "Request payload is too large." : "Invalid request." } },
    { status }
  );
}

export async function readBoundedText(
  request: Request,
  maxBytes: number
): Promise<ValidationResult<string>> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    return { ok: false, response: errorResponse(413, "payload_too_large") };
  }
  try {
    const text = await request.text();
    return new TextEncoder().encode(text).byteLength > maxBytes
      ? { ok: false, response: errorResponse(413, "payload_too_large") }
      : { ok: true, data: text };
  } catch {
    return { ok: false, response: errorResponse(400, "invalid_request") };
  }
}

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes: number = REQUEST_LIMITS.smallJson
): Promise<ValidationResult<T>> {
  const body = await readBoundedText(request, maxBytes);
  if (!body.ok) return body;

  let input: unknown;
  try {
    input = JSON.parse(body.data);
  } catch {
    return { ok: false, response: errorResponse(400, "invalid_request") };
  }

  const parsed = schema.safeParse(input);
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, response: errorResponse(400, "invalid_request") };
}

export function parseQuery<T>(request: Request, schema: z.ZodType<T>): ValidationResult<T> {
  const input = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = schema.safeParse(input);
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, response: errorResponse(400, "invalid_request") };
}

export function parseRouteParams<T>(params: unknown, schema: z.ZodType<T>): ValidationResult<T> {
  const parsed = schema.safeParse(params);
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, response: errorResponse(400, "invalid_request") };
}
