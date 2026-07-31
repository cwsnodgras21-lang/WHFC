import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppSession } from "@/lib/auth/session";
import { executeUpdateExpirationSettings } from "@/lib/expiration/mutations";
import type { Database } from "@/lib/types/database";

const adminSession: AppSession = {
  user: { id: "user-1", email: "admin@example.com" },
  profile: {
    id: "user-1",
    role: "administrator",
    active: true,
    created_at: "",
    updated_at: "",
    full_name: "Admin",
  },
};

const staffSession: AppSession = {
  user: { id: "user-2", email: "staff@example.com" },
  profile: {
    id: "user-2",
    role: "staff",
    active: true,
    created_at: "",
    updated_at: "",
    full_name: "Staff",
  },
};

function createMockSupabase() {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { id: "org-1" }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  } as unknown as SupabaseClient<Database>;
}

describe("executeUpdateExpirationSettings", () => {
  it("allows an administrator to set clinic-wide defaults", async () => {
    const supabase = createMockSupabase();
    const result = await executeUpdateExpirationSettings(supabase, adminSession, {
      defaultExpirationWarningDays: "60",
      defaultSampleExpirationWarningDays: "45",
    });
    expect(result.success).toBe(true);
  });

  it("denies staff — expiration settings are an administrative operation", async () => {
    const supabase = createMockSupabase();
    const result = await executeUpdateExpirationSettings(supabase, staffSession, {
      defaultExpirationWarningDays: "60",
      defaultSampleExpirationWarningDays: "45",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a zero or negative warning period", async () => {
    const supabase = createMockSupabase();
    const result = await executeUpdateExpirationSettings(supabase, adminSession, {
      defaultExpirationWarningDays: "0",
      defaultSampleExpirationWarningDays: "45",
    });
    expect(result.success).toBe(false);
  });
});
