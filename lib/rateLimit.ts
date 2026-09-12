import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export type RateLimitClass =
  | "public-light"
  | "authenticated-standard"
  | "sensitive"
  | "ai-light"
  | "ai-heavy"
  | "admin"
  | "internal";

type RateLimitPolicy = {
  limit: number;
  windowSeconds: number;
  failClosed: boolean;
};

function configuredPositiveInteger(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function policy(prefix: string, limit: number, windowSeconds: number, failClosed: boolean): RateLimitPolicy {
  return {
    limit: configuredPositiveInteger(`RATE_LIMIT_${prefix}_MAX`, limit),
    windowSeconds: configuredPositiveInteger(`RATE_LIMIT_${prefix}_WINDOW_SECONDS`, windowSeconds),
    failClosed,
  };
}

export const RATE_LIMIT_POLICIES: Record<RateLimitClass, RateLimitPolicy> = {
  "public-light": policy("PUBLIC_LIGHT", 60, 60, false),
  "authenticated-standard": policy("AUTHENTICATED_STANDARD", 120, 60, false),
  sensitive: policy("SENSITIVE", 10, 300, true),
  "ai-light": policy("AI_LIGHT", 20, 3600, true),
  "ai-heavy": policy("AI_HEAVY", 5, 3600, true),
  admin: policy("ADMIN", 30, 300, true),
  internal: policy("INTERNAL", 3, 900, true),
};

export type RateLimitStore = {
  consume(input: {
    action: string;
    identityHash: string;
    limit: number;
    windowSeconds: number;
    cost: number;
  }): Promise<{ allowed: boolean; retryAfterSeconds: number }>;
};

export function trustedClientAddress(request: Request, trustProxy = process.env.TRUST_PROXY_HEADERS === "true") {
  if (!trustProxy) return null;
  const address = request.headers.get("x-real-ip")?.trim() || "";
  return isIP(address) ? address : null;
}

export function limiterIdentity(kind: "user" | "network" | "internal", value: string) {
  const secret = process.env.RATE_LIMIT_ID_SECRET;
  if ((!secret || secret.length < 32) && process.env.NODE_ENV === "production") {
    throw new Error("RATE_LIMIT_ID_SECRET must contain at least 32 characters in production");
  }
  return `${kind}:${createHmac("sha256", secret || "aiprod-rate-limit-local").update(value).digest("hex")}`;
}

export function authenticatedLimiterIdentity(verifiedUserId: string) {
  return limiterIdentity("user", verifiedUserId);
}

export function anonymousLimiterIdentity(request: Request, trustProxy?: boolean) {
  const address = trustedClientAddress(request, trustProxy);
  return address ? limiterIdentity("network", address) : null;
}

export function rateLimitResponse(retryAfterSeconds: number) {
  const retryAfter = Math.max(1, Math.ceil(retryAfterSeconds));
  return Response.json(
    { ok: false, error: { code: "rate_limited", message: "Too many requests." } },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

export const postgresRateLimitStore: RateLimitStore = {
  async consume(input) {
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    const { data, error } = await supabaseAdmin.rpc("consume_rate_limit", {
      p_action: input.action,
      p_identity_hash: input.identityHash,
      p_limit: input.limit,
      p_window_seconds: input.windowSeconds,
      p_cost: input.cost,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row.allowed !== "boolean") {
      throw new Error("Invalid rate-limit store response");
    }
    return {
      allowed: row.allowed,
      retryAfterSeconds: Number(row.retry_after_seconds || input.windowSeconds),
    };
  },
};

export async function enforceAuthenticatedRateLimit(
  verifiedUserId: string,
  action: string,
  rateClass: RateLimitClass,
  cost = 1
) {
  return enforceRateLimit({
    action,
    identity: authenticatedLimiterIdentity(verifiedUserId),
    rateClass,
    cost,
    store: postgresRateLimitStore,
  });
}

export async function enforceAnonymousRateLimit(
  request: Request,
  action: string,
  rateClass: RateLimitClass
) {
  const identity = anonymousLimiterIdentity(request);
  if (!identity) {
    return {
      ok: false as const,
      response: Response.json(
        { ok: false, error: { code: "client_identity_unavailable", message: "Request cannot be processed safely." } },
        { status: 503 }
      ),
    };
  }
  return enforceRateLimit({ action, identity, rateClass, store: postgresRateLimitStore });
}

export async function enforceProviderRateLimit(input: {
  request: Request;
  action: string;
  rateClass: "ai-light" | "ai-heavy" | "sensitive" | "admin";
  verifiedUserId?: string;
  cost?: number;
}) {
  return input.verifiedUserId
    ? enforceAuthenticatedRateLimit(input.verifiedUserId, input.action, input.rateClass, input.cost)
    : enforceAnonymousRateLimit(input.request, input.action, input.rateClass);
}

export async function enforceInternalRateLimit(action: string) {
  return enforceRateLimit({
    action,
    identity: limiterIdentity("internal", action),
    rateClass: "internal",
    store: postgresRateLimitStore,
  });
}

export async function enforceRateLimit(input: {
  action: string;
  identity: string;
  rateClass: RateLimitClass;
  cost?: number;
  store: RateLimitStore;
}): Promise<{ ok: true } | { ok: false; response: Response }> {
  const policy = RATE_LIMIT_POLICIES[input.rateClass];
  try {
    const result = await input.store.consume({
      action: input.action,
      identityHash: input.identity,
      limit: policy.limit,
      windowSeconds: policy.windowSeconds,
      cost: input.cost ?? 1,
    });
    if (result.allowed) return { ok: true };
    console.warn("[rate-limit] blocked", {
      action: input.action,
      rateClass: input.rateClass,
      identityTag: input.identity.slice(-12),
    });
    return { ok: false, response: rateLimitResponse(result.retryAfterSeconds) };
  } catch {
    console.error("[rate-limit] store unavailable", { action: input.action, rateClass: input.rateClass });
    if (!policy.failClosed) return { ok: true };
    return {
      ok: false,
      response: Response.json(
        { ok: false, error: { code: "rate_limit_unavailable", message: "Request cannot be processed safely." } },
        { status: 503 }
      ),
    };
  }
}
