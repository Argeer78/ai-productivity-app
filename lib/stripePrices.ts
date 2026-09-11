import "server-only";

export type StripeCurrency = "eur" | "usd" | "gbp";
export type StripePlan = "pro" | "yearly" | "founder";

const priceEnvironmentKeys: Record<StripePlan, Record<StripeCurrency, string>> = {
  pro: {
    eur: "STRIPE_PRICE_PRO_EUR",
    usd: "STRIPE_PRICE_PRO_USD",
    gbp: "STRIPE_PRICE_PRO_GBP",
  },
  yearly: {
    eur: "STRIPE_PRICE_YEARLY_EUR",
    usd: "STRIPE_PRICE_YEARLY_USD",
    gbp: "STRIPE_PRICE_YEARLY_GBP",
  },
  founder: {
    eur: "STRIPE_PRICE_FOUNDER_EUR",
    usd: "STRIPE_PRICE_FOUNDER_USD",
    gbp: "STRIPE_PRICE_FOUNDER_GBP",
  },
};

export function getStripePriceId(plan: StripePlan, currency: StripeCurrency) {
  return process.env[priceEnvironmentKeys[plan][currency]] || null;
}

export function isFounderPriceId(priceId: string) {
  return (Object.keys(priceEnvironmentKeys.founder) as StripeCurrency[]).some(
    (currency) => getStripePriceId("founder", currency) === priceId
  );
}