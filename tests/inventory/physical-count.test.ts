import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppSession } from "@/lib/auth/session";
import {
  executeCancelPhysicalCount,
  executeCompletePhysicalCount,
  executeSavePhysicalCountLines,
  executeStartPhysicalCount,
  submitCancelPhysicalCount,
  submitCompletePhysicalCount,
  submitSavePhysicalCountLines,
  submitStartPhysicalCount,
} from "@/lib/physical-counts/operations";
import type { Database } from "@/lib/types/database";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";
const otherUuid = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const countId = "8f3b2c1a-9e8d-4b7a-8c6d-5e4f3a2b1c0d";

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

function createMockSupabase(
  rpcImpl: (...args: unknown[]) => Promise<{ data: unknown; error: { message: string } | null }>
) {
  return {
    rpc: vi.fn().mockImplementation(rpcImpl),
  } as unknown as SupabaseClient<Database>;
}

describe("executeStartPhysicalCount", () => {
  it("denies staff before calling RPC", async () => {
    const supabase = createMockSupabase(async () => ({
      data: null,
      error: null,
    }));

    const result = await executeStartPhysicalCount(supabase, staffSession, {
      locationId: validUuid,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/permission/i);
    }
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

describe("submitStartPhysicalCount", () => {
  it("starts a count and returns the count id", async () => {
    const supabase = createMockSupabase(async () => ({
      data: countId,
      error: null,
    }));

    const result = await submitStartPhysicalCount(supabase, {
      locationId: validUuid,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.physicalCountId).toBe(countId);
    }

    expect(supabase.rpc).toHaveBeenCalledWith("start_physical_count", {
      p_location_id: validUuid,
    });
  });

  it("maps one active count per location errors", async () => {
    const supabase = createMockSupabase(async () => ({
      data: null,
      error: { message: "physical_count_already_in_progress" },
    }));

    const result = await submitStartPhysicalCount(supabase, {
      locationId: validUuid,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/already in progress/i);
    }
  });
});

describe("submitSavePhysicalCountLines", () => {
  it("records counted quantities through upsert RPC", async () => {
    const supabase = createMockSupabase(async () => ({
      data: "line-1",
      error: null,
    }));

    const result = await submitSavePhysicalCountLines(supabase, {
      physicalCountId: countId,
      lines: [
        { itemId: validUuid, countedQuantity: 10 },
        { itemId: otherUuid, countedQuantity: 3 },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.savedLineCount).toBe(2);
    }

    expect(supabase.rpc).toHaveBeenCalledWith("upsert_physical_count_line", {
      p_physical_count_id: countId,
      p_item_id: validUuid,
      p_counted_quantity: 10,
    });
  });

  it("maps not-editable count errors", async () => {
    const supabase = createMockSupabase(async () => ({
      data: null,
      error: { message: "physical_count_not_editable" },
    }));

    const result = await submitSavePhysicalCountLines(supabase, {
      physicalCountId: countId,
      lines: [{ itemId: validUuid, countedQuantity: 1 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/no longer be edited/i);
    }
  });
});

describe("submitCompletePhysicalCount", () => {
  it("completes a count and returns correction count", async () => {
    const supabase = createMockSupabase(async () => ({
      data: {
        physical_count_id: countId,
        corrections_posted: 2,
      },
      error: null,
    }));

    const result = await submitCompletePhysicalCount(supabase, {
      physicalCountId: countId,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.correctionsPosted).toBe(2);
    }

    expect(supabase.rpc).toHaveBeenCalledWith("complete_physical_count", {
      p_physical_count_id: countId,
    });
  });
});

describe("executeCancelPhysicalCount", () => {
  it("denies staff before calling RPC", async () => {
    const supabase = createMockSupabase(async () => ({
      data: null,
      error: null,
    }));

    const result = await executeCancelPhysicalCount(supabase, staffSession, {
      physicalCountId: countId,
    });

    expect(result.success).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

describe("submitCancelPhysicalCount", () => {
  it("cancels an in-progress count through RPC", async () => {
    const supabase = createMockSupabase(async () => ({
      data: null,
      error: null,
    }));

    const result = await submitCancelPhysicalCount(supabase, {
      physicalCountId: countId,
    });

    expect(result.success).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith("cancel_physical_count", {
      p_physical_count_id: countId,
    });
  });
});

describe("executeSavePhysicalCountLines", () => {
  it("returns validation errors for empty line payloads", async () => {
    const supabase = createMockSupabase(async () => ({
      data: "line-1",
      error: null,
    }));

    const result = await executeSavePhysicalCountLines(
      supabase,
      managerSession,
      {
        physicalCountId: countId,
        lines: [],
      }
    );

    expect(result.success).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

describe("executeCompletePhysicalCount", () => {
  it("maps not-in-progress completion errors", async () => {
    const supabase = createMockSupabase(async () => ({
      data: null,
      error: { message: "physical_count_not_in_progress" },
    }));

    const result = await executeCompletePhysicalCount(
      supabase,
      managerSession,
      { physicalCountId: countId }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/not in progress/i);
    }
  });
});
