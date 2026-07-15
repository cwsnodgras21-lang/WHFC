import { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { feedbackFormSchema } from "@/lib/validation/feedback";

export const runtime = "nodejs";

const APP_SLUG = "white-house-family-care";
const DEFAULT_NOLTURN_FEEDBACK_URL = "https://nolturn.nolturn.io/api/ops/feedback";
const MAX_BODY_BYTES = 16 * 1024;

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "Expected a JSON request body." }, { status: 415 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Feedback is too large." }, { status: 413 });
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
    .select("full_name, active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.active) {
    return Response.json({ error: "Active account required." }, { status: 403 });
  }

  let rawBody: unknown;
  try {
    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) {
      return Response.json({ error: "Feedback is too large." }, { status: 413 });
    }
    rawBody = JSON.parse(bodyText);
  } catch {
    return Response.json({ error: "Expected a JSON request body." }, { status: 400 });
  }

  const parsed = feedbackFormSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json({ error: "Check the feedback fields and try again." }, { status: 422 });
  }

  const token = process.env.NOLTURN_FEEDBACK_TOKEN;
  if (!token) {
    console.error("[feedback] NOLTURN_FEEDBACK_TOKEN is not configured");
    return Response.json(
      { error: "Feedback service is not configured." },
      { status: 503 }
    );
  }

  const nolturnUrl =
    process.env.NOLTURN_FEEDBACK_URL ?? DEFAULT_NOLTURN_FEEDBACK_URL;

  try {
    const response = await fetch(nolturnUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        appSlug: APP_SLUG,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        reporter: {
          name: profile.full_name,
          email: user.email,
          externalId: user.id,
        },
        context: {
          pageUrl: parsed.data.pageUrl,
          appVersion: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8),
          browser: parsed.data.browser,
        },
      }),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });

    const result = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      console.error("[feedback] Nolturn rejected feedback", response.status);
      return Response.json(
        { error: "Feedback could not be submitted." },
        { status: response.status }
      );
    }

    if (typeof result.reference !== "string") {
      console.error("[feedback] Nolturn response did not include a reference");
      return Response.json(
        { error: "Feedback service returned an invalid response." },
        { status: 502 }
      );
    }

    return Response.json(
      {
        reference: result.reference,
        status: result.status,
        message: "Feedback received.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[feedback] Nolturn request failed", error);
    return Response.json(
      { error: "Feedback service is temporarily unavailable." },
      { status: 502 }
    );
  }
}
