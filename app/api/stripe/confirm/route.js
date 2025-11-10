import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const userId = session.metadata?.user_id;
    if (!userId) {
      return NextResponse.json(
        { error: "No user id in session metadata" },
        { status: 400 }
      );
    }

    // Mark user as pro
    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          plan: "pro",
        },
        { onConflict: "id" }
      );

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Failed to update profile plan" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Stripe confirm error:", err);
    return NextResponse.json(
      { error: "Stripe confirm failed" },
      { status: 500 }
    );
  }
}
