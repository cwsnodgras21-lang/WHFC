import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppSession } from "@/lib/auth/session";
import {
  executeBulkDisposeLots,
  executeMarkLotsReviewed,
} from "@/lib/inventory/bulk-lot-actions";
import {
  areAllLotsSelected,
  clearLotSelection,
  selectAllLotIds,
  summarizeBulkResult,
  toggleLotSelection,
} from "@/lib/expiration/selection";
import type { Database } from "@/lib/types/database";

const lotA = "550e8400-e29b-41d4-a716-446655440000";
const lotB = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const lotC = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

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

describe("expiration selection helpers", () => {
  it("toggles, selects all, and clears lots", () => {
    let selected = clearLotSelection();
    selected = toggleLotSelection(selected, lotA);
    expect(selected.has(lotA)).toBe(true);
    selected = toggleLotSelection(selected, lotA);
    expect(selected.has(lotA)).toBe(false);

    selected = selectAllLotIds([lotA, lotB]);
    expect(areAllLotsSelected(selected, [lotA, lotB])).toBe(true);
    expect(areAllLotsSelected(selected, [lotA, lotB, lotC])).toBe(false);
  });

  it("summarizes mixed bulk results", () => {
    expect(
      summarizeBulkResult({ succeeded: 2, failed: 0, errors: [] })
    ).toBe("Updated 2 lots.");
    expect(
      summarizeBulkResult({
        succeeded: 1,
        failed: 2,
        errors: [
          { lotId: lotA, error: "x" },
          { lotId: lotB, error: "y" },
        ],
      })
    ).toBe("Updated 1 lot; 2 failed.");
  });
});

describe("executeBulkDisposeLots", () => {
  it("denies read-only users before calling RPC", async () => {
    const rpc = vi.fn();
    const supabase = { rpc } as unknown as SupabaseClient<Database>;

    const result = await executeBulkDisposeLots(supabase, readOnlySession, {
      lotIds: [lotA],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/permission/i);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls dispose_lot once per selected lot and aggregates failures", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({ data: null, error: null }) // record_activity
      .mockResolvedValueOnce({
        data: null,
        error: { message: "lot_not_found" },
      });

    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const supabase = { rpc, from } as unknown as SupabaseClient<Database>;

    const result = await executeBulkDisposeLots(supabase, staffSession, {
      lotIds: [lotA, lotB],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors[0]?.lotId).toBe(lotB);
      expect(result.message).toMatch(/1 failed/i);
    }

    const disposeCalls = rpc.mock.calls.filter(
      ([name]) => name === "dispose_lot"
    );
    expect(disposeCalls).toHaveLength(2);
    expect(disposeCalls[0]?.[1]).toMatchObject({
      p_lot_id: lotA,
      p_reason_code: "expired_disposal",
    });
  });
});

describe("executeMarkLotsReviewed", () => {
  it("publishes expiration.reviewed for each lot", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "evt", error: null });
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [
            { lot_id: lotA, item_name: "Gloves" },
            { lot_id: lotB, item_name: "Syringes" },
          ],
          error: null,
        }),
      }),
    });
    const supabase = { rpc, from } as unknown as SupabaseClient<Database>;

    const result = await executeMarkLotsReviewed(supabase, staffSession, {
      lotIds: [lotA, lotB],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
    }

    const activityCalls = rpc.mock.calls.filter(
      ([name]) => name === "record_activity"
    );
    expect(activityCalls).toHaveLength(2);
    expect(activityCalls[0]?.[1]).toMatchObject({
      p_module: "expiration",
      p_event_type: "expiration.reviewed",
      p_entity_id: lotA,
    });
  });
});
