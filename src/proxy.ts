import { updateSession } from "@/lib/supabase/session";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 Proxy — Supabase session refresh and auth-route redirects only.
 * Authorization is enforced independently in layouts, Server Actions,
 * database RPC functions, grants, and RLS.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
