import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      userId,
      clickType,   // 'stay' | 'flight' | 'car'
      provider,    // 'booking' | 'google-flights' | 'booking-cars'
      destination,
      fromCity,
      checkin,
      checkout,
      adults,
      children,
      meta,
    } = body || {};

    if (!clickType || !provider) {
      return NextResponse.json(
        { ok: false, error: "Missing clickType or provider" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("travel_clicks").insert([
      {
        user_id: userId || null,
        click_type: clickType,
        provider,
        destination: destination || null,
        from_city: fromCity || null,
        checkin: checkin || null,
        checkout: checkout || null,
        adults: typeof adults === "number" ? adults : null,
        children: typeof children === "number" ? children : null,
        meta: meta || null,
      },
    ]);

    if (error) {
      console.error("[travel-click] insert error", error);
      return NextResponse.json(
        { ok: false, error: "Failed to log click" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[travel-click] fatal error", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 }
    );
  }
}
