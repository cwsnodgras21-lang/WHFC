import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppSession } from "@/lib/auth/session";
import {
  executeConsumeInventory,
  submitConsumeInventory,
} from "@/lib/inventory/consume";
import type { Database } from "@/lib/types/database";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";
const otherUuid = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

const staffSession: AppSession = {
  user: { id: "user-1", email: "staff@example.com" },
  profile: {
    id: "user-1",
    role: "staff",
    active: true,
    created_at: "",
    updated_at: "",
    full_name: "Staff User",
  },
};

const readOnlySession: AppSession = {
  ...staffSession,
  profile: { ...staffSession.profile, role: "read_only" },
};

function createMockSupabase(options: {
  rpcResult?: { data: unknown; error: { message: string } | null };
  onHand?: number;
  onHandSequence?: number[];
  locationLocked?: boolean;
}) {
  const onHandValues = options.onHandSequence ?? [options.onHand ?? 0];
  let onHandCall = 0;

  const onHandMaybeSingle = vi.fn().mockImplementation(async () => {
    const value = onHandValues[Math.min(onHandCall, onHandValues.length - 1)];
    onHandCall += 1;
    return {
      data: { quantity_on_hand: value },
      error: null,
    };
  });
  const onHandSecondEq = { maybeSingle: onHandMaybeSingle };
  const onHandFirstEq = { eq: vi.fn().mockReturnValue(onHandSecondEq) };
  const onHandChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue(onHandFirstEq),
    }),
  };

  const lockMaybeSingle = vi.fn().mockResolvedValue({
    data: options.locationLocked ? { id: "count-1" } : null,
    error: null,
  });
  const lockSecondEq = { maybeSingle: lockMaybeSingle };
  const lockFirstEq = { eq: vi.fn().mockReturnValue(lockSecondEq) };
  const lockChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue(lockFirstEq),
    }),
  };

  return {
    rpc: vi.fn().mockResolvedValue(
      options.rpcResult ?? { data: "tx-id-1", error: null }
    ),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "physical_counts") {
        return lockChain;
      }
      return onHandChain;
    }),
  } as unknown as SupabaseClient<Database>;
}

describe("executeConsumeInventory", () => {
  it("denies read-only users before calling RPC", async () => {
    const supabase = createMockSupabase({});

    const result = await executeConsumeInventory(supabase, readOnlySession, {
      itemId: validUuid,
      locationId: otherUuid,
      quantity: 2,
      reasonCode: "clinic_use",
      transactionDate: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/permission/i);
    }
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("returns validation errors for invalid payloads", async () => {
    const supabase = createMockSupabase({});

    const result = await executeConsumeInventory(supabase, staffSession, {
      itemId: "not-a-uuid",
      locationId: otherUuid,
      quantity: -1,
      reasonCode: "clinic_use",
      transactionDate: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

describe("submitConsumeInventory", () => {
  it("returns success with updated on-hand after RPC", async () => {
    const supabase = createMockSupabase({
      rpcResult: {
        data: { transaction_group_id: "tx-id-88", lots_affected: 0 },
        error: null,
      },
      onHandSequence: [10, 7],
    });

    const result = await submitConsumeInventory(supabase, {
      itemId: validUuid,
      locationId: otherUuid,
      quantity: 3,
      reasonCode: "clinic_use",
      transactionDate: new Date("2026-07-05T19:30:00.000Z"),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transactionId).toBe("tx-id-88");
      expect(result.quantityConsumed).toBe(3);
      expect(result.updatedOnHand).toBe(7);
    }

    expect(supabase.rpc).toHaveBeenCalledWith("consume_inventory", {
      p_item_id: validUuid,
      p_location_id: otherUuid,
      p_quantity: 3,
      p_reason_code: "clinic_use",
      p_transaction_date: "2026-07-05T19:30:00.000Z",
    });
  });

  it("blocks consume when quantity exceeds on-hand before RPC", async () => {
    const supabase = createMockSupabase({ onHand: 2 });

    const result = await submitConsumeInventory(supabase, {
      itemId: validUuid,
      locationId: otherUuid,
      quantity: 5,
      reasonCode: "clinic_use",
      transactionDate: new Date("2026-07-05T19:30:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/insufficient stock/i);
    }
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("maps RPC negative inventory errors", async () => {
    const supabase = createMockSupabase({
      onHand: 5,
      rpcResult: {
        data: null,
        error: { message: "negative_inventory_not_allowed" },
      },
    });

    const result = await submitConsumeInventory(supabase, {
      itemId: validUuid,
      locationId: otherUuid,
      quantity: 4,
      reasonCode: "damaged_disposal",
      transactionDate: new Date("2026-07-05T19:30:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/insufficient stock/i);
    }
  });

  it("maps RPC permission errors to user-friendly messages", async () => {
    const supabase = createMockSupabase({
      onHand: 10,
      rpcResult: {
        data: null,
        error: { message: "insufficient_privilege: consume denied" },
      },
    });

    const result = await submitConsumeInventory(supabase, {
      itemId: validUuid,
      locationId: otherUuid,
      quantity: 1,
      reasonCode: "clinic_use",
      transactionDate: new Date("2026-07-05T19:30:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/permission/i);
    }
  });

  it("maps invalid reason RPC errors", async () => {
    const supabase = createMockSupabase({
      onHand: 10,
      rpcResult: {
        data: null,
        error: { message: "invalid_reason_for_transaction_type" },
      },
    });

    const result = await submitConsumeInventory(supabase, {
      itemId: validUuid,
      locationId: otherUuid,
      quantity: 1,
      reasonCode: "clinic_use",
      transactionDate: new Date("2026-07-05T19:30:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/reason/i);
    }
  });
});
