import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppSession } from "@/lib/auth/session";
import { executeCreateVendor, insertVendor } from "@/lib/vendors/mutations";
import type { Database } from "@/lib/types/database";

const managerSession: AppSession = {
  user: { id: "user-1", email: "manager@example.com" },
  profile: {
    id: "user-1",
    role: "inventory_manager",
    active: true,
    created_at: "",
    updated_at: "",
    full_name: "Manager",
  },
};

function createMockSupabase(options: {
  insertResult?: { data: { id: string } | null; error: { message: string } | null };
}) {
  const singleInsert = vi.fn().mockResolvedValue(
    options.insertResult ?? { data: { id: "vendor-1" }, error: null }
  );

  return {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: singleInsert }),
      }),
    }),
  } as unknown as SupabaseClient<Database>;
}

describe("vendor mutations", () => {
  it("creates vendors for inventory managers", async () => {
    const supabase = createMockSupabase({});
    const result = await executeCreateVendor(supabase, managerSession, {
      name: "MedSupply Co",
      contactEmail: null,
      contactPhone: null,
      active: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.vendorId).toBe("vendor-1");
    }
  });

  it("maps duplicate vendor names", async () => {
    const supabase = createMockSupabase({
      insertResult: {
        data: null,
        error: { message: "duplicate key value violates unique constraint" },
      },
    });
    const result = await insertVendor(supabase, {
      name: "MedSupply Co",
      contactEmail: null,
      contactPhone: null,
      active: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/already exists/i);
    }
  });
});
