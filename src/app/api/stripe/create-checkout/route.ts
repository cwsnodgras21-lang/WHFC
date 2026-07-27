import { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe/checkout";
import { createCheckoutRequestSchema } from "@/lib/validation/billing";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "Expected a JSON request body." }, { status: 415 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.active || profile.role !== "administrator") {
    return Response.json({ error: "Administrator access required." }, { status: 403 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON request body." }, { status: 400 });
  }

  const parsed = createCheckoutRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: "Check the checkout request and try again." },
      { status: 422 }
    );
  }

  const { successUrl, cancelUrl } = parsed.data;
  if (
    new URL(successUrl).origin !== request.nextUrl.origin ||
    new URL(cancelUrl).origin !== request.nextUrl.origin
  ) {
    return Response.json({ error: "Redirect URLs must be same-origin." }, { status: 422 });
  }

  try {
    const { url } = await createCheckoutSession({
      mode: parsed.data.mode,
      priceId: parsed.data.priceId,
      successUrl,
      cancelUrl,
      customerEmail: user.email ?? null,
      customerName: profile.full_name,
      externalId: user.id,
    });

    return Response.json({ url }, { status: 200 });
  } catch (error) {
    console.error("[stripe-create-checkout] Failed to create checkout session", error);
    return Response.json({ error: "Could not start checkout." }, { status: 502 });
  }
}
