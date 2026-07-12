import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppSession } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";
import {
  executeCreateLocation,
  executeSetLocationActive,
  executeUpdateLocation,
  insertLocation,
} from "@/lib/locations/mutations";

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

function createSupabaseForInsert(options?: {
  result?: { data: { id: string } | null; error: { message: string } | null };
}) {
  const single = vi.fn().mockResolvedValue(
    options?.result ?? { data: { id: "location-1" }, error: null }
  );

  return {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single }),
      }),
    }),
  } as unknown as SupabaseClient<Database>;
}

function createSupabaseForUpdate(options?: {
  existing?: {
    data:
      | {
          id: string;
          location_name: string;
          room: string | null;
          cabinet: string | null;
          shelf: string | null;
          bin: string | null;
        }
      | null;
    error: { message: string } | null;
  };
  txCount?: number;
  updateResult?: { data: { id: string } | null; error: { message: string } | null };
}) {
  const existingMaybeSingle = vi.fn().mockResolvedValue(
    options?.existing ?? {
      data: {
        id: "location-1",
        location_name: "Supply Closet",
        room: "101",
        cabinet: "A",
        shelf: "1",
        bin: "2",
      },
      error: null,
    }
  );
  const headSelect = vi.fn().mockResolvedValue({
    count: options?.txCount ?? 0,
    error: null,
  });
  const updateSingle = vi.fn().mockResolvedValue(
    options?.updateResult ?? { data: { id: "location-1" }, error: null }
  );

  return {
    from: vi.fn((table: string) => {
      if (table === "locations") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle: existingMaybeSingle }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({ single: updateSingle }),
            }),
          }),
        };
      }

      if (table === "inventory_transactions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: headSelect,
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  } as unknown as SupabaseClient<Database>;
}

function createSupabaseForToggle(options?: {
  result?: { data: { id: string } | null; error: { message: string } | null };
}) {
  const maybeSingle = vi.fn().mockResolvedValue(
    options?.result ?? { data: { id: "location-1" }, error: null }
  );

  return {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ maybeSingle }),
        }),
      }),
    }),
  } as unknown as SupabaseClient<Database>;
}

describe("location mutations", () => {
  it("creates locations for inventory managers", async () => {
    const supabase = createSupabaseForInsert();
    const result = await executeCreateLocation(supabase, managerSession, {
      locationName: "Supply Closet",
      room: "101",
      cabinet: "A",
      shelf: "1",
      bin: "2",
      active: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.locationId).toBe("location-1");
    }
  });

  it("denies create for view-only roles", async () => {
    const supabase = createSupabaseForInsert();
    const result = await executeCreateLocation(supabase, staffSession, {
      locationName: "Supply Closet",
      room: null,
      cabinet: null,
      shelf: null,
      bin: null,
      active: true,
    });

    expect(result).toEqual({
      success: false,
      error: "You do not have permission to manage locations.",
    });
  });

  it("maps duplicate active location names", async () => {
    const supabase = createSupabaseForInsert({
      result: {
        data: null,
        error: { message: "duplicate key value violates unique constraint" },
      },
    });
    const result = await insertLocation(supabase, {
      locationName: "Supply Closet",
      room: null,
      cabinet: null,
      shelf: null,
      bin: null,
      active: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/already exists/i);
    }
  });

  it("updates locations when history is not affected", async () => {
    const supabase = createSupabaseForUpdate();
    const result = await executeUpdateLocation(supabase, managerSession, {
      id: "6a1cf720-38b2-42ef-89c6-6131c2243347",
      locationName: "Supply Closet East",
      room: "102",
      cabinet: "B",
      shelf: "2",
      bin: "4",
      active: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.locationId).toBe("location-1");
    }
  });

  it("prevents identity edits once transactions exist", async () => {
    const supabase = createSupabaseForUpdate({ txCount: 3 });
    const result = await executeUpdateLocation(supabase, managerSession, {
      id: "6a1cf720-38b2-42ef-89c6-6131c2243347",
      locationName: "Supply Closet East",
      room: "101",
      cabinet: "A",
      shelf: "1",
      bin: "2",
      active: true,
    });

    expect(result).toEqual({
      success: false,
      error:
        "Location identity cannot be changed after inventory transactions exist for this location.",
    });
  });

  it("allows activate and deactivate", async () => {
    const supabase = createSupabaseForToggle();
    const result = await executeSetLocationActive(
      supabase,
      managerSession,
      "6a1cf720-38b2-42ef-89c6-6131c2243347",
      false
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.locationId).toBe("location-1");
    }
  });
});
