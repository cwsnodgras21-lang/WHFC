import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppSession } from "@/lib/auth/session";
import {
  executeReceiveSample,
  executeDispenseSample,
} from "@/lib/samples/mutations";
import type { Database } from "@/lib/types/database";

const staffSession: AppSession = {
  user: { id: "user-1", email: "staff@example.com" },
  profile: {
    id: "user-1",
    role: "staff",
    active: true,
    created_at: "",
    updated_at: "",
    full_name: "Staff",
  },
};

const medicSession: AppSession = {
  user: { id: "user-2", email: "medic@example.com" },
  profile: {
    id: "user-2",
    role: "medic",
    active: true,
    created_at: "",
    updated_at: "",
    full_name: "Medic",
  },
};

const readOnlySession: AppSession = {
  user: { id: "user-3", email: "readonly@example.com" },
  profile: {
    id: "user-3",
    role: "read_only",
    active: true,
    created_at: "",
    updated_at: "",
    full_name: "Read Only",
  },
};

function createMockSupabase(options: {
  rpcResult?: { data: unknown; error: { message: string } | null };
}) {
  return {
    rpc: vi.fn().mockResolvedValue(
      options.rpcResult ?? {
        data: { transaction_id: "tx-1" },
        error: null,
      }
    ),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { product_name: "Sample X" }, error: null }),
        }),
      }),
    }),
  } as unknown as SupabaseClient<Database>;
}

const PRODUCT_ID = "11111111-1111-1111-8111-111111111111";

describe("executeReceiveSample", () => {
  it("allows staff to receive samples", async () => {
    const supabase = createMockSupabase({});
    const result = await executeReceiveSample(supabase, staffSession, {
      sampleProductId: PRODUCT_ID,
      quantity: "10",
    });
    expect(result.success).toBe(true);
  });

  it("denies medic — receiving is not part of the medic workflow", async () => {
    const supabase = createMockSupabase({});
    const result = await executeReceiveSample(supabase, medicSession, {
      sampleProductId: PRODUCT_ID,
      quantity: "10",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/permission/i);
    }
  });

  it("denies read-only users", async () => {
    const supabase = createMockSupabase({});
    const result = await executeReceiveSample(supabase, readOnlySession, {
      sampleProductId: PRODUCT_ID,
      quantity: "10",
    });
    expect(result.success).toBe(false);
  });
});

describe("executeDispenseSample", () => {
  it("allows medic to give samples", async () => {
    const supabase = createMockSupabase({});
    const result = await executeDispenseSample(supabase, medicSession, {
      sampleProductId: PRODUCT_ID,
      quantity: "1",
      patientReference: "MRN-1234",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a dispense with no patient reference", async () => {
    const supabase = createMockSupabase({});
    const result = await executeDispenseSample(supabase, medicSession, {
      sampleProductId: PRODUCT_ID,
      quantity: "1",
      patientReference: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a dispense with a full name instead of a short reference", async () => {
    const supabase = createMockSupabase({});
    const result = await executeDispenseSample(supabase, medicSession, {
      sampleProductId: PRODUCT_ID,
      quantity: "1",
      patientReference: "x".repeat(65),
    });
    expect(result.success).toBe(false);
  });

  it("surfaces available vs. requested quantity when stock is insufficient", async () => {
    const supabase = createMockSupabase({
      rpcResult: {
        data: null,
        error: {
          message: "insufficient_sample_stock:item=Sample X,available=2,requested=5",
        },
      },
    });
    const result = await executeDispenseSample(supabase, medicSession, {
      sampleProductId: PRODUCT_ID,
      quantity: "5",
      patientReference: "MRN-1234",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("2 available");
      expect(result.error).toContain("5 requested");
    }
  });

  it("denies read-only users", async () => {
    const supabase = createMockSupabase({});
    const result = await executeDispenseSample(supabase, readOnlySession, {
      sampleProductId: PRODUCT_ID,
      quantity: "1",
      patientReference: "MRN-1234",
    });
    expect(result.success).toBe(false);
  });
});
