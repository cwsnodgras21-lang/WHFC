import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppSession } from "@/lib/auth/session";
import {
  executeCreateItem,
  executeSetItemActive,
  executeUpdateItem,
  insertItem,
  updateItemRecord,
} from "@/lib/items/mutations";
import type { Database } from "@/lib/types/database";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";
const otherUuid = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const thirdUuid = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

const managerSession: AppSession = {
  user: { id: "user-1", email: "manager@example.com" },
  profile: {
    id: "user-1",
    role: "inventory_manager",
    active: true,
    created_at: "",
    updated_at: "",
    full_name: "Inventory Manager",
  },
};

const staffSession: AppSession = {
  ...managerSession,
  profile: { ...managerSession.profile, role: "staff" },
};

const validCreateInput = {
  itemName: "Exam Gloves",
  internalSku: "GLV-100",
  categoryId: validUuid,
  unitOfMeasureId: otherUuid,
  preferredVendorId: null,
  reorderPoint: 10,
  parLevel: 30,
  active: true,
  trackExpiration: false,
  trackLotNumber: false,
  expirationWarningDays: 90,
};

function createMockSupabase(options: {
  insertResult?: { data: { id: string } | null; error: { message: string } | null };
  updateResult?: { data: { id: string } | null; error: { message: string } | null };
  existingItem?: { id: string; unit_of_measure_id: string } | null;
  transactionCount?: number;
}) {
  const maybeSingleExisting = vi.fn().mockResolvedValue({
    data: options.existingItem ?? null,
    error: null,
  });

  const singleUpdate = vi.fn().mockResolvedValue(
    options.updateResult ?? { data: { id: validUuid }, error: null }
  );

  const singleInsert = vi.fn().mockResolvedValue(
    options.insertResult ?? { data: { id: validUuid }, error: null }
  );

  const transactionCount = vi.fn().mockResolvedValue({
    count: options.transactionCount ?? 0,
    error: null,
  });

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "items") {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: singleInsert,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: singleUpdate,
              maybeSingle: singleUpdate,
            }),
          }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: maybeSingleExisting,
          }),
        }),
      };
    }

    if (table === "inventory_transactions") {
      return {
        select: vi.fn().mockReturnValue({
          eq: transactionCount,
        }),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return { from } as unknown as SupabaseClient<Database>;
}

describe("executeCreateItem", () => {
  it("denies staff before writing to the database", async () => {
    const supabase = createMockSupabase({});

    const result = await executeCreateItem(supabase, staffSession, validCreateInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/permission/i);
    }
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("creates items for inventory managers", async () => {
    const supabase = createMockSupabase({});

    const result = await executeCreateItem(
      supabase,
      managerSession,
      validCreateInput
    );

    expect(result.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith("items");
  });

  it("maps duplicate SKU database errors", async () => {
    const supabase = createMockSupabase({
      insertResult: {
        data: null,
        error: { message: "duplicate key value violates unique constraint" },
      },
    });

    const result = await insertItem(supabase, validCreateInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/SKU already exists/i);
    }
  });
});

describe("executeUpdateItem", () => {
  it("blocks stocking unit changes when transactions exist", async () => {
    const supabase = createMockSupabase({
      existingItem: { id: validUuid, unit_of_measure_id: otherUuid },
      transactionCount: 2,
    });

    const result = await updateItemRecord(supabase, {
      id: validUuid,
      ...validCreateInput,
      unitOfMeasureId: thirdUuid,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/Stocking unit cannot be changed/i);
    }
  });

  it("updates items for inventory managers", async () => {
    const supabase = createMockSupabase({
      existingItem: { id: validUuid, unit_of_measure_id: otherUuid },
    });

    const result = await executeUpdateItem(supabase, managerSession, {
      id: validUuid,
      ...validCreateInput,
    });

    expect(result.success).toBe(true);
  });
});

describe("executeSetItemActive", () => {
  it("deactivates items without deleting them", async () => {
    const supabase = createMockSupabase({
      updateResult: { data: { id: validUuid }, error: null },
    });

    const result = await executeSetItemActive(
      supabase,
      managerSession,
      validUuid,
      false
    );

    expect(result.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith("items");
  });

  it("denies staff from changing active status", async () => {
    const supabase = createMockSupabase({});

    const result = await executeSetItemActive(
      supabase,
      staffSession,
      validUuid,
      false
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/permission/i);
    }
  });
});
