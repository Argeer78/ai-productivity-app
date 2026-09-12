import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";
import { parseJsonBody, REQUEST_LIMITS } from "@/lib/apiValidation";
import { enforceAnonymousRateLimit, enforceAuthenticatedRateLimit } from "@/lib/rateLimit";

const requestSchema = z.object({
  clickType: z.enum(["stay", "flight", "car"]),
  provider: z.enum(["booking", "google-flights", "booking-cars"]),
  destination: z.string().max(200).optional(),
  fromCity: z.string().max(200).optional(),
  checkin: z.iso.date().optional(),
  checkout: z.iso.date().optional(),
  adults: z.number().int().min(1).max(20).optional(),
  children: z.number().int().min(0).max(20).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
}).strict();

export async function POST(req: Request) {
  try {
    const parsedBody = await parseJsonBody(req, requestSchema, REQUEST_LIMITS.smallJson);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data;
    const hasBearerToken = req.headers.get("authorization")?.startsWith("Bearer ") ?? false;
    const auth = hasBearerToken ? await getAuthenticatedUser(req) : null;
    if (hasBearerToken && !auth?.user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: auth?.error === "server_misconfigured" ? 500 : 401 }
      );
    }

    const {
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

    const rateLimit = auth?.user
      ? await enforceAuthenticatedRateLimit(auth.user.id, "public:travel-click", "authenticated-standard")
      : await enforceAnonymousRateLimit(req, "public:travel-click", "public-light");
    if (!rateLimit.ok) return rateLimit.response;

    const { error } = await supabaseAdmin.from("travel_clicks").insert([
      {
        user_id: auth?.user?.id || null,
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
