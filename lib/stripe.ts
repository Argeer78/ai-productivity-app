// lib/stripe.ts
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// In development / when not configured, we keep Stripe disabled gracefully.
if (!STRIPE_SECRET_KEY) {
  console.warn(
    "[stripe] STRIPE_SECRET_KEY is not set. Stripe client is disabled."
  );
}

export const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      // Use the exact version your installed stripe SDK expects
      apiVersion: "2025-10-29.clover",
    })
  : null;
