import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppSession } from "@/lib/auth/session";
import { executeCreateUnit, executeUpdateUnit } from "@/lib/units/mutations";
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

const managerSession: AppSession = {
  ...adminSession,
  profile: { ...adminSession.profile, role: "inventory_manager" },
};

function createMockSupabase() {
  const singleInsert = vi.fn().mockResolvedValue({ data: { id: "unit-1" }, error: null });
  const singleUpdate = vi.fn().mockResolvedValue({ data: { id: "unit-1" }, error: null });

  return {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: singleInsert }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: singleUpdate }),
        }),
      }),
    }),
  } as unknown as SupabaseClient<Database>;
}

describe("unit mutations", () => {
  it("allows administrators to create units", async () => {
    const supabase = createMockSupabase();
    const result = await executeCreateUnit(supabase, adminSession, {
      name: "Box",
      abbreviation: "bx",
      active: true,
    });
    expect(result.success).toBe(true);
  });

  it("denies inventory managers from creating units", async () => {
    const supabase = createMockSupabase();
    const result = await executeCreateUnit(supabase, managerSession, {
      name: "Box",
      abbreviation: "bx",
      active: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/permission/i);
    }
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("allows administrators to update units", async () => {
    const supabase = createMockSupabase();
    const result = await executeUpdateUnit(supabase, adminSession, {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Case",
      abbreviation: "cs",
      active: true,
    });
    expect(result.success).toBe(true);
  });
});
