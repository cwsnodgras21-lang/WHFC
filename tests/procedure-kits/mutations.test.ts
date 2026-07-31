import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppSession } from "@/lib/auth/session";
import { executeSaveProcedureKit } from "@/lib/procedure-kits/mutations";
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

function createMockSupabase() {
  const insertedComponents: unknown[] = [];

  const supabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "procedure_kits") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: { id: "kit-1" }, error: null }),
            }),
          }),
        };
      }
      if (table === "procedure_kit_components") {
        return {
          insert: vi.fn().mockImplementation((rows: unknown[]) => {
            insertedComponents.push(...rows);
            return Promise.resolve({ error: null });
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  } as unknown as SupabaseClient<Database>;

  return { supabase, insertedComponents };
}

const baseComponent = {
  itemId: "11111111-1111-1111-8111-111111111111",
  quantity: 1,
  unit: "EA",
  isVariableQuantity: false,
  required: true,
  displayOrder: 0,
};

describe("executeSaveProcedureKit", () => {
  it("denies medic — kit management is not part of the medic role", async () => {
    const { supabase } = createMockSupabase();
    const result = await executeSaveProcedureKit(supabase, medicSession, {
      name: "Blood draw",
      active: true,
      components: [baseComponent],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/permission/i);
    }
  });

  it("persists display order and dosage presets for adjustable components", async () => {
    const { supabase, insertedComponents } = createMockSupabase();
    const result = await executeSaveProcedureKit(supabase, managerSession, {
      name: "Testosterone injection",
      active: true,
      components: [
        {
          ...baseComponent,
          displayOrder: 0,
        },
        {
          itemId: "22222222-2222-2222-8222-222222222222",
          quantity: 1,
          unit: "mL",
          isVariableQuantity: true,
          variableQuantityLabel: "Administered amount",
          variableQuantityUnit: "mg",
          calculationType: "concentration",
          concentrationAmount: 200,
          concentrationUnit: "mg",
          concentrationVolume: 1,
          concentrationVolumeUnit: "mL",
          required: true,
          displayOrder: 1,
          dosagePresets: [0.02, 0.25, 0.5, 1],
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(insertedComponents).toHaveLength(2);
    expect(insertedComponents[0]).toMatchObject({ display_order: 0 });
    expect(insertedComponents[1]).toMatchObject({
      display_order: 1,
      dosage_presets: [0.02, 0.25, 0.5, 1],
    });
  });

  it("rejects dosage presets on a fixed (non-adjustable) component", async () => {
    const { supabase } = createMockSupabase();
    const result = await executeSaveProcedureKit(supabase, managerSession, {
      name: "Fixed kit",
      active: true,
      components: [
        {
          ...baseComponent,
          dosagePresets: [1, 2],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("caps kit instructions at 2000 characters", async () => {
    const { supabase } = createMockSupabase();
    const result = await executeSaveProcedureKit(supabase, managerSession, {
      name: "Long instructions kit",
      active: true,
      instructions: "x".repeat(2001),
      components: [baseComponent],
    });
    expect(result.success).toBe(false);
  });
});
