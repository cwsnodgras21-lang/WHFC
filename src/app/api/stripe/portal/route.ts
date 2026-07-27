import { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createPortalSession } from "@/lib/stripe/checkout";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
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
    .select("active, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.active || profile.role !== "administrator") {
    return Response.json({ error: "Administrator access required." }, { status: 403 });
  }

  try {
    const { url } = await createPortalSession({
      returnUrl: `${request.nextUrl.origin}/administration/billing`,
    });

    return Response.json({ url }, { status: 200 });
  } catch (error) {
    console.error("[stripe-portal] Failed to create portal session", error);
    return Response.json({ error: "Could not open billing portal." }, { status: 502 });
  }
}
