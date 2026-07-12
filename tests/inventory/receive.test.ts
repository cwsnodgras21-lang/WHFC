import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppSession } from "@/lib/auth/session";
import {
  executeReceiveInventory,
  submitReceiveInventory,
} from "@/lib/inventory/receive";
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
  rpcResult?: { data: string | null; error: { message: string } | null };
  onHand?: number;
  locationLocked?: boolean;
}) {
  const onHandMaybeSingle = vi.fn().mockResolvedValue({
    data: { quantity_on_hand: options.onHand ?? 0 },
    error: null,
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

describe("executeReceiveInventory", () => {
  it("denies read-only users before calling RPC", async () => {
    const supabase = createMockSupabase({});

    const result = await executeReceiveInventory(supabase, readOnlySession, {
      itemId: validUuid,
      locationId: otherUuid,
      quantity: 5,
      reasonCode: "vendor_delivery",
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

    const result = await executeReceiveInventory(supabase, staffSession, {
      itemId: "not-a-uuid",
      locationId: otherUuid,
      quantity: -1,
      reasonCode: "vendor_delivery",
      transactionDate: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

describe("submitReceiveInventory", () => {
  it("returns success with updated on-hand after RPC", async () => {
    const supabase = createMockSupabase({
      rpcResult: { data: "tx-id-99", error: null },
      onHand: 25,
    });

    const result = await submitReceiveInventory(supabase, {
      itemId: validUuid,
      locationId: otherUuid,
      quantity: 10,
      reasonCode: "vendor_delivery",
      transactionDate: new Date("2026-07-05T19:30:00.000Z"),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transactionId).toBe("tx-id-99");
      expect(result.quantityReceived).toBe(10);
      expect(result.updatedOnHand).toBe(25);
    }

    expect(supabase.rpc).toHaveBeenCalledWith("receive_inventory", {
      p_item_id: validUuid,
      p_location_id: otherUuid,
      p_quantity: 10,
      p_reason_code: "vendor_delivery",
      p_transaction_date: "2026-07-05T19:30:00.000Z",
    });
  });

  it("maps RPC permission errors to user-friendly messages", async () => {
    const supabase = createMockSupabase({
      rpcResult: {
        data: null,
        error: { message: "insufficient_privilege: receive denied" },
      },
    });

    const result = await submitReceiveInventory(supabase, {
      itemId: validUuid,
      locationId: otherUuid,
      quantity: 2,
      reasonCode: "initial_stock",
      transactionDate: new Date("2026-07-05T19:30:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/permission/i);
    }
  });

  it("maps invalid reason RPC errors", async () => {
    const supabase = createMockSupabase({
      rpcResult: {
        data: null,
        error: { message: "invalid_reason_for_transaction_type" },
      },
    });

    const result = await submitReceiveInventory(supabase, {
      itemId: validUuid,
      locationId: otherUuid,
      quantity: 2,
      reasonCode: "vendor_delivery",
      transactionDate: new Date("2026-07-05T19:30:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/reason/i);
    }
  });
});
