import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let database: "reachable" | "unreachable" = "unreachable";
  let databaseHttpStatus: number | null = null;
  const configuration = {
    url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    key: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };

  try {
    const supabaseUrl = getSupabaseUrl();
    const anonKey = getSupabaseAnonKey();
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/health_check`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "content-type": "application/json",
      },
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    databaseHttpStatus = response.status;
    database = response.ok ? "reachable" : "unreachable";
  } catch (error) {
    console.error("[health] Supabase connectivity check failed", error);
  }

  const healthy = database === "reachable";
  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      database,
      databaseHttpStatus,
      configuration,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? "local",
    },
    {
      status: healthy ? 200 : 503,
      headers: { "cache-control": "no-store" },
    }
  );
}
