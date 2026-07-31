import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageSampleProducts } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type SampleProductListItem = {
  id: string;
  productName: string;
  manufacturerVendor: string | null;
  strength: string | null;
  dosageForm: string | null;
  unitAbbreviation: string;
  reorderThreshold: number;
  active: boolean;
  quantityOnHand: number;
};

export type SampleProductDetail = {
  id: string;
  productName: string;
  manufacturerVendor: string | null;
  strength: string | null;
  dosageForm: string | null;
  unitOfMeasureId: string;
  reorderThreshold: number;
  expirationWarningDays: number | null;
  active: boolean;
  notes: string | null;
};

export type SampleProductsPageData = {
  canManage: boolean;
  permissionMessage: string | null;
  products: SampleProductListItem[];
  loadError: string | null;
};

export async function getSampleProductsPageData(
  supabase: Client,
  session: AppSession
): Promise<SampleProductsPageData> {
  const canManage = canManageSampleProducts(
    session.profile.role,
    session.profile.active
  );

  if (!canManage) {
    return {
      canManage: false,
      permissionMessage: "You do not have permission to manage sample products.",
      products: [],
      loadError: null,
    };
  }

  const { data, error } = await supabase
    .from("sample_product_stock")
    .select(
      "sample_product_id, product_name, manufacturer_vendor, strength, dosage_form, unit_abbreviation, reorder_threshold, active, quantity_on_hand"
    )
    .order("product_name");

  if (error) {
    return { canManage, permissionMessage: null, products: [], loadError: error.message };
  }

  const products: SampleProductListItem[] = (data ?? []).map((row) => ({
    id: row.sample_product_id!,
    productName: row.product_name!,
    manufacturerVendor: row.manufacturer_vendor,
    strength: row.strength,
    dosageForm: row.dosage_form,
    unitAbbreviation: row.unit_abbreviation ?? "EA",
    reorderThreshold: Number(row.reorder_threshold ?? 0),
    active: row.active ?? true,
    quantityOnHand: Number(row.quantity_on_hand ?? 0),
  }));

  return { canManage, permissionMessage: null, products, loadError: null };
}

export type SampleProductEditorData = {
  canManage: boolean;
  permissionMessage: string | null;
  product: SampleProductDetail | null;
  units: { id: string; name: string; abbreviation: string }[];
  loadError: string | null;
};

export async function getSampleProductEditorData(
  supabase: Client,
  session: AppSession,
  sampleProductId?: string
): Promise<SampleProductEditorData> {
  const canManage = canManageSampleProducts(
    session.profile.role,
    session.profile.active
  );

  if (!canManage) {
    return {
      canManage: false,
      permissionMessage: "You do not have permission to manage sample products.",
      product: null,
      units: [],
      loadError: null,
    };
  }

  const [productResult, unitsResult] = await Promise.all([
    sampleProductId
      ? supabase
          .from("sample_products")
          .select(
            "id, product_name, manufacturer_vendor, strength, dosage_form, unit_of_measure_id, reorder_threshold, expiration_warning_days, active, notes"
          )
          .eq("id", sampleProductId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("units_of_measure")
      .select("id, name, abbreviation")
      .eq("active", true)
      .order("name"),
  ]);

  const loadError = productResult.error?.message ?? unitsResult.error?.message ?? null;

  let product: SampleProductDetail | null = null;
  if (productResult.data) {
    const row = productResult.data;
    product = {
      id: row.id,
      productName: row.product_name,
      manufacturerVendor: row.manufacturer_vendor,
      strength: row.strength,
      dosageForm: row.dosage_form,
      unitOfMeasureId: row.unit_of_measure_id,
      reorderThreshold: Number(row.reorder_threshold),
      expirationWarningDays: row.expiration_warning_days,
      active: row.active,
      notes: row.notes,
    };
  }

  return {
    canManage,
    permissionMessage: null,
    product,
    units: (unitsResult.data ?? []).map((u) => ({
      id: u.id,
      name: u.name,
      abbreviation: u.abbreviation,
    })),
    loadError,
  };
}
