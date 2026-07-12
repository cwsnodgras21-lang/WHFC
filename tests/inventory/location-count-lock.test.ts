import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  LOCATION_COUNT_LOCK_MESSAGE,
  LOCATION_PHYSICAL_COUNT_IN_PROGRESS_CODE,
  mapLocationPhysicalCountRpcError,
} from "@/lib/inventory/location-count-lock";
import { submitConsumeInventory } from "@/lib/inventory/consume";
import { submitReceiveInventory } from "@/lib/inventory/receive";
import { submitTransferInventory } from "@/lib/inventory/transfer";
import type { Database } from "@/lib/types/database";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";
const fromUuid = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const toUuid = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

function createLockCheckMock(options: {
  locationLocked?: boolean;
  rpcResult?: { data: unknown; error: { message: string } | null };
  onHand?: number;
  onHandSequence?: number[];
}) {
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

  const onHandValues = options.onHandSequence ?? [options.onHand ?? 10];
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

describe("mapLocationPhysicalCountRpcError", () => {
  it("maps database lock errors to the user-facing message", () => {
    expect(
      mapLocationPhysicalCountRpcError(
        LOCATION_PHYSICAL_COUNT_IN_PROGRESS_CODE
      )
    ).toBe(LOCATION_COUNT_LOCK_MESSAGE);
    expect(mapLocationPhysicalCountRpcError("permission denied")).toBeNull();
  });
});

describe("inventory movement blocked during active physical count", () => {
  it("blocks receive at a locked location before RPC", async () => {
    const supabase = createLockCheckMock({ locationLocked: true });

    const result = await submitReceiveInventory(supabase, {
      itemId: validUuid,
      locationId: fromUuid,
      quantity: 2,
      reasonCode: "vendor_delivery",
      transactionDate: new Date("2026-07-05T19:30:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(LOCATION_COUNT_LOCK_MESSAGE);
    }
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("blocks consume at a locked location before RPC", async () => {
    const supabase = createLockCheckMock({ locationLocked: true });

    const result = await submitConsumeInventory(supabase, {
      itemId: validUuid,
      locationId: fromUuid,
      quantity: 1,
      reasonCode: "clinic_use",
      transactionDate: new Date("2026-07-05T19:30:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(LOCATION_COUNT_LOCK_MESSAGE);
    }
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("blocks transfer when either location is locked before RPC", async () => {
    const supabase = createLockCheckMock({ locationLocked: true });

    const result = await submitTransferInventory(supabase, {
      itemId: validUuid,
      fromLocationId: fromUuid,
      toLocationId: toUuid,
      quantity: 1,
      transactionDate: new Date("2026-07-05T19:30:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(LOCATION_COUNT_LOCK_MESSAGE);
    }
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

describe("database RPC rejects movement during active physical count", () => {
  it("rejects receive_inventory when the RPC raises location_physical_count_in_progress", async () => {
    const supabase = createLockCheckMock({
      locationLocked: false,
      rpcResult: {
        data: null,
        error: { message: LOCATION_PHYSICAL_COUNT_IN_PROGRESS_CODE },
      },
    });

    const result = await submitReceiveInventory(supabase, {
      itemId: validUuid,
      locationId: fromUuid,
      quantity: 2,
      reasonCode: "vendor_delivery",
      transactionDate: new Date("2026-07-05T19:30:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(LOCATION_COUNT_LOCK_MESSAGE);
    }
    expect(supabase.rpc).toHaveBeenCalledWith("receive_inventory", {
      p_item_id: validUuid,
      p_location_id: fromUuid,
      p_quantity: 2,
      p_reason_code: "vendor_delivery",
      p_transaction_date: "2026-07-05T19:30:00.000Z",
    });
  });

  it("rejects consume_inventory when the RPC raises location_physical_count_in_progress", async () => {
    const supabase = createLockCheckMock({
      locationLocked: false,
      onHand: 10,
      rpcResult: {
        data: null,
        error: { message: LOCATION_PHYSICAL_COUNT_IN_PROGRESS_CODE },
      },
    });

    const result = await submitConsumeInventory(supabase, {
      itemId: validUuid,
      locationId: fromUuid,
      quantity: 1,
      reasonCode: "clinic_use",
      transactionDate: new Date("2026-07-05T19:30:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(LOCATION_COUNT_LOCK_MESSAGE);
    }
    expect(supabase.rpc).toHaveBeenCalledWith("consume_inventory", {
      p_item_id: validUuid,
      p_location_id: fromUuid,
      p_quantity: 1,
      p_reason_code: "clinic_use",
      p_transaction_date: "2026-07-05T19:30:00.000Z",
    });
  });

  it("rejects transfer_inventory when the RPC raises location_physical_count_in_progress", async () => {
    const supabase = createLockCheckMock({
      locationLocked: false,
      onHandSequence: [10],
      rpcResult: {
        data: null,
        error: { message: LOCATION_PHYSICAL_COUNT_IN_PROGRESS_CODE },
      },
    });

    const result = await submitTransferInventory(supabase, {
      itemId: validUuid,
      fromLocationId: fromUuid,
      toLocationId: toUuid,
      quantity: 1,
      transactionDate: new Date("2026-07-05T19:30:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(LOCATION_COUNT_LOCK_MESSAGE);
    }
    expect(supabase.rpc).toHaveBeenCalledWith("transfer_inventory", {
      p_item_id: validUuid,
      p_from_location_id: fromUuid,
      p_to_location_id: toUuid,
      p_quantity: 1,
      p_transaction_date: "2026-07-05T19:30:00.000Z",
    });
  });
});
