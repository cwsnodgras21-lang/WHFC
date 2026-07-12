import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppSession } from "@/lib/auth/session";
import {
  executeCreateCategory,
  executeSetCategoryActive,
  insertCategory,
} from "@/lib/categories/mutations";
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

const staffSession: AppSession = {
  ...managerSession,
  profile: { ...managerSession.profile, role: "staff" },
};

function createMockSupabase(options: {
  insertResult?: { data: { id: string } | null; error: { message: string } | null };
  updateResult?: { data: { id: string } | null; error: { message: string } | null };
}) {
  const singleInsert = vi.fn().mockResolvedValue(
    options.insertResult ?? { data: { id: "cat-1" }, error: null }
  );
  const maybeSingleUpdate = vi.fn().mockResolvedValue(
    options.updateResult ?? { data: { id: "cat-1" }, error: null }
  );

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "categories") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: singleInsert }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({ maybeSingle: maybeSingleUpdate }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  } as unknown as SupabaseClient<Database>;
}

describe("category mutations", () => {
  it("creates categories for inventory managers", async () => {
    const supabase = createMockSupabase({});
    const result = await executeCreateCategory(supabase, managerSession, {
      name: "PPE",
      description: null,
      active: true,
    });
    expect(result.success).toBe(true);
  });

  it("denies staff from creating categories", async () => {
    const supabase = createMockSupabase({});
    const result = await executeCreateCategory(supabase, staffSession, {
      name: "PPE",
      description: null,
      active: true,
    });
    expect(result.success).toBe(false);
  });

  it("maps duplicate category names", async () => {
    const supabase = createMockSupabase({
      insertResult: {
        data: null,
        error: { message: "duplicate key value violates unique constraint" },
      },
    });
    const result = await insertCategory(supabase, {
      name: "PPE",
      description: null,
      active: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/already exists/i);
    }
  });

  it("deactivates categories without deleting them", async () => {
    const supabase = createMockSupabase({});
    const result = await executeSetCategoryActive(
      supabase,
      managerSession,
      "cat-1",
      false
    );
    expect(result.success).toBe(true);
  });
});
