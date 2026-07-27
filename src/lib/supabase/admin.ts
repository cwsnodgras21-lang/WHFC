import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";
import { getSupabaseUrl } from "@/lib/supabase/env";

function getServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }
  return value;
}

/**
 * Service-role Supabase client. Bypasses RLS — the billing_* tables have no
 * authenticated-user policies, so this is the only client that can read/write
 * them. Do not use outside src/lib/stripe/ and src/lib/data/billing-page.ts.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(getSupabaseUrl(), getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
