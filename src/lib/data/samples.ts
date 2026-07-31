import type { SupabaseClient } from "@supabase/supabase-js";

import {
  canDispenseSample,
  canReceiveSample,
  canViewSamples,
} from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type SampleStockRow = {
  sampleProductId: string;
  productName: string;
  manufacturerVendor: string | null;
  strength: string | null;
  dosageForm: string | null;
  unitAbbreviation: string;
  reorderThreshold: number;
  expirationWarningDays: number | null;
  active: boolean;
  notes: string | null;
  quantityOnHand: number;
  nextExpirationDate: string | null;
  hasExpiredLot: boolean;
  hasExpiringLot: boolean;
};

export type SamplesPageData = {
  canView: boolean;
  permissionMessage: string | null;
  rows: SampleStockRow[];
  loadError: string | null;
};

const STOCK_SELECT =
  "sample_product_id, product_name, manufacturer_vendor, strength, dosage_form, unit_abbreviation, reorder_threshold, expiration_warning_days, active, notes, quantity_on_hand, next_expiration_date, has_expired_lot, has_expiring_lot";

type StockSelectRow = Pick<
  Database["public"]["Views"]["sample_product_stock"]["Row"],
  | "sample_product_id"
  | "product_name"
  | "manufacturer_vendor"
  | "strength"
  | "dosage_form"
  | "unit_abbreviation"
  | "reorder_threshold"
  | "expiration_warning_days"
  | "active"
  | "notes"
  | "quantity_on_hand"
  | "next_expiration_date"
  | "has_expired_lot"
  | "has_expiring_lot"
>;

function mapStockRow(row: StockSelectRow): SampleStockRow {
  return {
    sampleProductId: row.sample_product_id!,
    productName: row.product_name!,
    manufacturerVendor: row.manufacturer_vendor,
    strength: row.strength,
    dosageForm: row.dosage_form,
    unitAbbreviation: row.unit_abbreviation ?? "EA",
    reorderThreshold: Number(row.reorder_threshold ?? 0),
    expirationWarningDays: row.expiration_warning_days,
    active: row.active ?? true,
    notes: row.notes,
    quantityOnHand: Number(row.quantity_on_hand ?? 0),
    nextExpirationDate: row.next_expiration_date,
    hasExpiredLot: row.has_expired_lot ?? false,
    hasExpiringLot: row.has_expiring_lot ?? false,
  };
}

export async function getSamplesPageData(
  supabase: Client,
  session: AppSession
): Promise<SamplesPageData> {
  const canView = canViewSamples(session.profile.active);

  if (!canView) {
    return {
      canView: false,
      permissionMessage: "Your account cannot view sample inventory.",
      rows: [],
      loadError: null,
    };
  }

  const { data, error } = await supabase
    .from("sample_product_stock")
    .select(STOCK_SELECT)
    .order("product_name");

  if (error) {
    return { canView, permissionMessage: null, rows: [], loadError: error.message };
  }

  return {
    canView,
    permissionMessage: null,
    rows: (data ?? []).map(mapStockRow),
    loadError: null,
  };
}

/** Lightweight stock fetch for the Action Center — active products only. */
export async function getSampleStockForAlerts(
  supabase: Client,
  session: AppSession
): Promise<SampleStockRow[] | null> {
  if (!session.profile.active) {
    return null;
  }

  const { data, error } = await supabase
    .from("sample_product_stock")
    .select(STOCK_SELECT)
    .eq("active", true);

  if (error || !data) {
    return null;
  }

  return data.map(mapStockRow);
}

export type SamplesHighlights = {
  lowStockCount: number;
  outOfStockCount: number;
  expiringCount: number;
  expiredCount: number;
};

const EMPTY_SAMPLES_HIGHLIGHTS: SamplesHighlights = {
  lowStockCount: 0,
  outOfStockCount: 0,
  expiringCount: 0,
  expiredCount: 0,
};

export function computeSamplesHighlights(
  rows: SampleStockRow[]
): SamplesHighlights {
  const highlights = { ...EMPTY_SAMPLES_HIGHLIGHTS };
  for (const row of rows) {
    if (row.quantityOnHand <= 0) {
      highlights.outOfStockCount += 1;
    } else if (row.quantityOnHand <= row.reorderThreshold) {
      highlights.lowStockCount += 1;
    }
    if (row.hasExpiredLot) {
      highlights.expiredCount += 1;
    } else if (row.hasExpiringLot) {
      highlights.expiringCount += 1;
    }
  }
  return highlights;
}

/** Highlights fetch for the Action Center — null when samples cannot be read. */
export async function getSamplesHighlights(
  supabase: Client,
  session: AppSession
): Promise<SamplesHighlights | null> {
  const rows = await getSampleStockForAlerts(supabase, session);
  if (!rows) return null;
  return computeSamplesHighlights(rows);
}

export type SampleReceivePageData = {
  canReceive: boolean;
  permissionMessage: string | null;
  products: { id: string; productName: string; unitAbbreviation: string }[];
  vendors: { id: string; name: string }[];
  loadError: string | null;
};

export async function getSampleReceivePageData(
  supabase: Client,
  session: AppSession
): Promise<SampleReceivePageData> {
  const canReceive = canReceiveSample(session.profile.role, session.profile.active);

  if (!canReceive) {
    return {
      canReceive: false,
      permissionMessage: "You do not have permission to receive samples.",
      products: [],
      vendors: [],
      loadError: null,
    };
  }

  const [productsResult, vendorsResult] = await Promise.all([
    supabase
      .from("sample_products")
      .select("id, product_name, units_of_measure ( abbreviation )")
      .eq("active", true)
      .order("product_name"),
    supabase.from("vendors").select("id, name").eq("active", true).order("name"),
  ]);

  const loadError = productsResult.error?.message ?? vendorsResult.error?.message ?? null;

  const products = (productsResult.data ?? []).map((p) => {
    const unit = p.units_of_measure as { abbreviation: string } | null;
    return {
      id: p.id,
      productName: p.product_name,
      unitAbbreviation: unit?.abbreviation ?? "EA",
    };
  });

  return {
    canReceive,
    permissionMessage: null,
    products,
    vendors: (vendorsResult.data ?? []).map((v) => ({ id: v.id, name: v.name })),
    loadError,
  };
}

export type SampleDispenseLotOption = {
  lotId: string;
  sampleProductId: string;
  lotNumber: string | null;
  expirationDate: string | null;
  quantityOnHand: number;
  status: string;
};

export type SampleDispensePageData = {
  canDispense: boolean;
  permissionMessage: string | null;
  products: {
    id: string;
    productName: string;
    unitAbbreviation: string;
    quantityOnHand: number;
  }[];
  lots: SampleDispenseLotOption[];
  loadError: string | null;
};

export async function getSampleDispensePageData(
  supabase: Client,
  session: AppSession
): Promise<SampleDispensePageData> {
  const canDispense = canDispenseSample(session.profile.role, session.profile.active);

  if (!canDispense) {
    return {
      canDispense: false,
      permissionMessage: "You do not have permission to give samples.",
      products: [],
      lots: [],
      loadError: null,
    };
  }

  const [stockResult, lotsResult] = await Promise.all([
    supabase
      .from("sample_product_stock")
      .select("sample_product_id, product_name, unit_abbreviation, quantity_on_hand")
      .eq("active", true)
      .gt("quantity_on_hand", 0)
      .order("product_name"),
    supabase
      .from("sample_lot_stock")
      .select("lot_id, sample_product_id, lot_number, expiration_date, quantity_on_hand, status")
      .gt("quantity_on_hand", 0),
  ]);

  const loadError = stockResult.error?.message ?? lotsResult.error?.message ?? null;

  const products = (stockResult.data ?? []).map((row) => ({
    id: row.sample_product_id!,
    productName: row.product_name!,
    unitAbbreviation: row.unit_abbreviation ?? "EA",
    quantityOnHand: Number(row.quantity_on_hand ?? 0),
  }));

  const lots: SampleDispenseLotOption[] = (lotsResult.data ?? []).map((row) => ({
    lotId: row.lot_id!,
    sampleProductId: row.sample_product_id!,
    lotNumber: row.lot_number,
    expirationDate: row.expiration_date,
    quantityOnHand: Number(row.quantity_on_hand ?? 0),
    status: row.status ?? "active",
  }));

  return {
    canDispense,
    permissionMessage: null,
    products,
    lots,
    loadError,
  };
}

export type SampleHistoryFilters = {
  sampleProductId?: string;
  patientReference?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type SampleHistoryRow = {
  id: string;
  sampleProductId: string;
  productName: string;
  transactionType: string;
  quantity: number;
  patientReference: string | null;
  performedByName: string | null;
  transactionDate: string;
  notes: string | null;
};

export type SampleHistoryPageData = {
  canView: boolean;
  permissionMessage: string | null;
  rows: SampleHistoryRow[];
  loadError: string | null;
};

export async function getSampleHistoryPageData(
  supabase: Client,
  session: AppSession,
  filters: SampleHistoryFilters
): Promise<SampleHistoryPageData> {
  const canView = canViewSamples(session.profile.active);

  if (!canView) {
    return {
      canView: false,
      permissionMessage: "Your account cannot view sample dispensing history.",
      rows: [],
      loadError: null,
    };
  }

  let query = supabase
    .from("sample_transactions")
    .select(
      "id, sample_product_id, transaction_type, quantity, patient_reference, transaction_date, notes, sample_products ( product_name ), profiles ( full_name )"
    )
    .order("transaction_date", { ascending: false })
    .limit(200);

  if (filters.sampleProductId) {
    query = query.eq("sample_product_id", filters.sampleProductId);
  }
  if (filters.patientReference) {
    query = query.ilike("patient_reference", `%${filters.patientReference}%`);
  }
  if (filters.dateFrom) {
    query = query.gte("transaction_date", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("transaction_date", filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    return { canView, permissionMessage: null, rows: [], loadError: error.message };
  }

  const rows: SampleHistoryRow[] = (data ?? []).map((row) => {
    const product = row.sample_products as { product_name: string } | null;
    const profile = row.profiles as { full_name: string | null } | null;
    return {
      id: row.id,
      sampleProductId: row.sample_product_id,
      productName: product?.product_name ?? "Unknown product",
      transactionType: row.transaction_type,
      quantity: Number(row.quantity),
      patientReference: row.patient_reference,
      performedByName: profile?.full_name ?? null,
      transactionDate: row.transaction_date,
      notes: row.notes,
    };
  });

  return { canView, permissionMessage: null, rows, loadError: null };
}
