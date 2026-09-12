import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import { enforceProviderRateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: auth.error === "server_misconfigured" ? 500 : 401 }
      );
    }

    if (!stripe) {
      return NextResponse.json({ error: "Billing is not configured on this environment" }, { status: 503 });
    }

    const rateLimit = await enforceProviderRateLimit({ request: req, action: "stripe:portal", rateClass: "sensitive", verifiedUserId: auth.user.id });
    if (!rateLimit.ok) return rateLimit.response;

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (error) {
      console.error("portal: profile query error", error);
      return NextResponse.json(
        { error: "Failed to load profile" },
        { status: 500 }
      );
    }

    const customerId = profile?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json(
        { error: "No Stripe customer found." },
        { status: 404 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL;

    if (!baseUrl) {
      return NextResponse.json(
        { error: "Application URL is not configured on this environment" },
        { status: 503 }
      );
    }

    const returnUrl = `${baseUrl.replace(/\/+$/, "")}/settings`;

    const params: Stripe.BillingPortal.SessionCreateParams = {
      customer: customerId,
      return_url: returnUrl,
    };

    if (process.env.STRIPE_PORTAL_CONFIGURATION_ID) {
      params.configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
    }

    const session = await stripe.billingPortal.sessions.create(params);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("portal route error:", err);
    return NextResponse.json(
      { error: "Could not open billing portal" },
      { status: 500 }
    );
  }
}
