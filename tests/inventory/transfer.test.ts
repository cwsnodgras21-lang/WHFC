import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppSession } from "@/lib/auth/session";
import {
  executeTransferInventory,
  submitTransferInventory,
} from "@/lib/inventory/transfer";
import type { Database } from "@/lib/types/database";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";
const fromUuid = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const toUuid = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

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

const readOnlySession: AppSession = {
  ...managerSession,
  profile: { ...managerSession.profile, role: "read_only" },
};

function createMockSupabase(options: {
  rpcResult?: {
    data: Record<string, string> | null;
    error: { message: string } | null;
  };
  onHandSequence?: number[];
  locationLocked?: boolean;
}) {
  const onHandValues = options.onHandSequence ?? [10, 8, 12, 14];
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
      options.rpcResult ?? {
        data: {
          transfer_out_id: "out-id-1",
          transfer_in_id: "in-id-1",
        },
        error: null,
      }
    ),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "physical_counts") {
        return lockChain;
      }
      return onHandChain;
    }),
  } as unknown as SupabaseClient<Database>;
}

const validInput = {
  itemId: validUuid,
  fromLocationId: fromUuid,
  toLocationId: toUuid,
  quantity: 2,
  transactionDate: new Date("2026-07-05T19:30:00.000Z"),
};

describe("executeTransferInventory", () => {
  it("denies staff before calling RPC", async () => {
    const supabase = createMockSupabase({});

    const result = await executeTransferInventory(
      supabase,
      staffSession,
      validInput
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/permission/i);
    }
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("denies read-only users before calling RPC", async () => {
    const supabase = createMockSupabase({});

    const result = await executeTransferInventory(
      supabase,
      readOnlySession,
      validInput
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/permission/i);
    }
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("returns validation errors for invalid payloads", async () => {
    const supabase = createMockSupabase({});

    const result = await executeTransferInventory(supabase, managerSession, {
      itemId: "not-a-uuid",
      fromLocationId: fromUuid,
      toLocationId: fromUuid,
      quantity: -1,
      transactionDate: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

describe("submitTransferInventory", () => {
  it("returns success with updated on-hand at both locations after RPC", async () => {
    const supabase = createMockSupabase({
      onHandSequence: [10, 8, 12],
    });

    const result = await submitTransferInventory(supabase, validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transferOutId).toBe("out-id-1");
      expect(result.transferInId).toBe("in-id-1");
      expect(result.quantityTransferred).toBe(2);
      expect(result.updatedOnHandAtSource).toBe(8);
      expect(result.updatedOnHandAtDestination).toBe(12);
    }

    expect(supabase.rpc).toHaveBeenCalledWith("transfer_inventory", {
      p_item_id: validUuid,
      p_from_location_id: fromUuid,
      p_to_location_id: toUuid,
      p_quantity: 2,
      p_transaction_date: "2026-07-05T19:30:00.000Z",
    });
  });

  it("blocks transfer when quantity exceeds source on-hand before RPC", async () => {
    const supabase = createMockSupabase({ onHandSequence: [2] });

    const result = await submitTransferInventory(supabase, {
      ...validInput,
      quantity: 5,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/insufficient stock/i);
    }
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("maps RPC negative inventory errors", async () => {
    const supabase = createMockSupabase({
      onHandSequence: [5],
      rpcResult: {
        data: null,
        error: { message: "negative_inventory_not_allowed" },
      },
    });

    const result = await submitTransferInventory(supabase, validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/insufficient stock/i);
    }
  });

  it("maps RPC permission errors to user-friendly messages", async () => {
    const supabase = createMockSupabase({
      onHandSequence: [10],
      rpcResult: {
        data: null,
        error: { message: "insufficient_privilege: transfer denied" },
      },
    });

    const result = await submitTransferInventory(supabase, validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/permission/i);
    }
  });

  it("maps distinct location RPC errors", async () => {
    const supabase = createMockSupabase({
      onHandSequence: [10],
      rpcResult: {
        data: null,
        error: { message: "transfer_requires_distinct_locations" },
      },
    });

    const result = await submitTransferInventory(supabase, validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/different locations/i);
    }
  });
});
