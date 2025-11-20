// lib/pricing.ts

export type SupportedCurrency = "eur" | "usd" | "gbp";

export const DEFAULT_CURRENCY: SupportedCurrency = "eur";

// 👇 Fill these with your real Stripe Price IDs
export const PRO_PRICE_IDS: Record<SupportedCurrency, string> = {
  eur: "price_1SSGYXIaVkwgnHGjQvoIBucm", // € Pro monthly
  usd: "price_1SVJ2fIaVkwgnHGjMwjCOjSj", // $ Pro monthly
  gbp: "price_1SVJ3bIaVkwgnHGjXFE3Mm1y", // £ Pro monthly
};

// Very small helper – keeps value safe
export function normalizeCurrency(input?: string | null): SupportedCurrency {
  if (!input) return DEFAULT_CURRENCY;

  const lower = input.toLowerCase();

  if (lower.startsWith("usd") || lower === "us") return "usd";
  if (lower.startsWith("gbp") || lower === "uk" || lower === "gb") return "gbp";
  if (lower.startsWith("eur") || lower === "eu") return "eur";

  return DEFAULT_CURRENCY;
}
