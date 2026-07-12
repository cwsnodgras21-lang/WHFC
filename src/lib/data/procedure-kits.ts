import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageProcedureKits } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type ProcedureKitListItem = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  defaultLocationId: string | null;
  defaultLocationName: string | null;
  componentCount: number;
  categoryName: string | null;
};

export type ProcedureKitComponentRow = {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  isVariableQuantity: boolean;
  variableQuantityLabel: string | null;
  variableQuantityUnit: string | null;
  calculationType: string | null;
  multiplier: number | null;
  concentrationAmount: number | null;
  concentrationUnit: string | null;
  concentrationVolume: number | null;
  concentrationVolumeUnit: string | null;
  required: boolean;
};

export type ProcedureKitDetail = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  categoryId: string | null;
  defaultLocationId: string | null;
  components: ProcedureKitComponentRow[];
};

export type ProcedureKitsPageData = {
  canManage: boolean;
  permissionMessage: string | null;
  kits: ProcedureKitListItem[];
  loadError: string | null;
};

export type ProcedureKitEditorData = {
  canManage: boolean;
  permissionMessage: string | null;
  kit: ProcedureKitDetail | null;
  items: { id: string; itemName: string; unitAbbreviation: string }[];
  locations: { id: string; locationName: string }[];
  categories: { id: string; name: string }[];
  loadError: string | null;
};

export async function getProcedureKitsPageData(
  supabase: Client,
  session: AppSession
): Promise<ProcedureKitsPageData> {
  const canManage = canManageProcedureKits(
    session.profile.role,
    session.profile.active
  );

  if (!canManage) {
    return {
      canManage: false,
      permissionMessage: "You do not have permission to manage procedure kits.",
      kits: [],
      loadError: null,
    };
  }

  const { data, error } = await supabase
    .from("procedure_kits")
    .select(
      `
      id,
      name,
      description,
      active,
      default_location_id,
      categories ( name ),
      locations!procedure_kits_default_location_id_fkey ( location_name ),
      procedure_kit_components ( id )
    `
    )
    .order("name");

  if (error) {
    return {
      canManage,
      permissionMessage: null,
      kits: [],
      loadError: error.message,
    };
  }

  const kits: ProcedureKitListItem[] = (data ?? []).map((kit) => {
    const category = kit.categories as { name: string } | null;
    const location = kit.locations as { location_name: string } | null;
    return {
      id: kit.id,
      name: kit.name,
      description: kit.description,
      active: kit.active,
      defaultLocationId: kit.default_location_id,
      defaultLocationName: location?.location_name ?? null,
      componentCount: (kit.procedure_kit_components ?? []).length,
      categoryName: category?.name ?? null,
    };
  });

  return {
    canManage,
    permissionMessage: null,
    kits,
    loadError: null,
  };
}

export async function getProcedureKitEditorData(
  supabase: Client,
  session: AppSession,
  kitId?: string
): Promise<ProcedureKitEditorData> {
  const canManage = canManageProcedureKits(
    session.profile.role,
    session.profile.active
  );

  if (!canManage) {
    return {
      canManage: false,
      permissionMessage: "You do not have permission to manage procedure kits.",
      kit: null,
      items: [],
      locations: [],
      categories: [],
      loadError: null,
    };
  }

  const [kitResult, itemsResult, locationsResult, categoriesResult] =
    await Promise.all([
      kitId
        ? supabase
            .from("procedure_kits")
            .select(
              `
            id,
            name,
            description,
            active,
            category_id,
            default_location_id,
            procedure_kit_components (
              id,
              item_id,
              quantity,
              unit,
              is_variable_quantity,
              variable_quantity_label,
              variable_quantity_unit,
              calculation_type,
              multiplier,
              concentration_amount,
              concentration_unit,
              concentration_volume,
              concentration_volume_unit,
              required,
              items ( item_name )
            )
          `
            )
            .eq("id", kitId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("items")
        .select("id, item_name, units_of_measure ( abbreviation )")
        .eq("active", true)
        .order("item_name"),
      supabase
        .from("locations")
        .select("id, location_name")
        .eq("active", true)
        .order("location_name"),
      supabase
        .from("categories")
        .select("id, name")
        .eq("active", true)
        .order("name"),
    ]);

  const loadError =
    kitResult.error?.message ??
    itemsResult.error?.message ??
    locationsResult.error?.message ??
    categoriesResult.error?.message ??
    null;

  let kit: ProcedureKitDetail | null = null;

  if (kitResult.data) {
    const row = kitResult.data;
    kit = {
      id: row.id,
      name: row.name,
      description: row.description,
      active: row.active,
      categoryId: row.category_id,
      defaultLocationId: row.default_location_id,
      components: (row.procedure_kit_components ?? []).map((c) => {
        const item = c.items as { item_name: string } | null;
        return {
          id: c.id,
          itemId: c.item_id,
          itemName: item?.item_name ?? "Unknown",
          quantity: Number(c.quantity),
          unit: c.unit,
          isVariableQuantity: c.is_variable_quantity,
          variableQuantityLabel: c.variable_quantity_label,
          variableQuantityUnit: c.variable_quantity_unit,
          calculationType: c.calculation_type,
          multiplier: c.multiplier !== null ? Number(c.multiplier) : null,
          concentrationAmount:
            c.concentration_amount !== null
              ? Number(c.concentration_amount)
              : null,
          concentrationUnit: c.concentration_unit,
          concentrationVolume:
            c.concentration_volume !== null
              ? Number(c.concentration_volume)
              : null,
          concentrationVolumeUnit: c.concentration_volume_unit,
          required: c.required,
        };
      }),
    };
  }

  const items = (itemsResult.data ?? []).map((item) => {
    const unit = item.units_of_measure as { abbreviation: string } | null;
    return {
      id: item.id,
      itemName: item.item_name,
      unitAbbreviation: unit?.abbreviation ?? "EA",
    };
  });

  return {
    canManage,
    permissionMessage: null,
    kit,
    items,
    locations: (locationsResult.data ?? []).map((l) => ({
      id: l.id,
      locationName: l.location_name,
    })),
    categories: (categoriesResult.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
    })),
    loadError,
  };
}
