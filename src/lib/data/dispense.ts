import type { SupabaseClient } from "@supabase/supabase-js";

import { canDispenseKit } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import type { KitComponentForCalculation } from "@/lib/dispense/calculate";
import { fetchOnHandByLocation, onHandKey } from "@/lib/data/inventory";
import { sortLotsFefo, type LotStatus } from "@/lib/lots/expiration";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type DispenseKitOption = {
  id: string;
  name: string;
  description: string | null;
  defaultLocationId: string | null;
  components: DispenseKitComponentDetail[];
};

export type DispenseKitComponentDetail = KitComponentForCalculation & {
  itemId: string;
  itemName: string;
  required: boolean;
};

export type DispenseLocationOption = {
  id: string;
  locationName: string;
  room: string | null;
};

export type DispenseLotOption = {
  lotId: string;
  itemId: string;
  locationId: string;
  expirationDate: string | null;
  receivedDate: string;
  quantityOnHand: number;
  status: LotStatus;
};

export type DispensePageData = {
  canDispense: boolean;
  permissionMessage: string | null;
  kits: DispenseKitOption[];
  locations: DispenseLocationOption[];
  onHandByKey: Record<string, number>;
  lots: DispenseLotOption[];
  loadError: string | null;
};

export async function getDispensePageData(
  supabase: Client,
  session: AppSession
): Promise<DispensePageData> {
  const canDispense = canDispenseKit(
    session.profile.role,
    session.profile.active
  );

  if (!canDispense) {
    return {
      canDispense: false,
      permissionMessage: "You do not have permission to dispense kits.",
      kits: [],
      locations: [],
      onHandByKey: {},
      lots: [],
      loadError: null,
    };
  }

  const [kitsResult, locationsResult, lotsResult] = await Promise.all([
    supabase
      .from("procedure_kits")
      .select(
        `
        id,
        name,
        description,
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
      .eq("active", true)
      .order("name"),
    supabase
      .from("locations")
      .select("id, location_name, room")
      .eq("active", true)
      .order("location_name"),
    supabase
      .from("inventory_lot_stock")
      .select(
        "lot_id, item_id, location_id, expiration_date, received_date, quantity_on_hand, status"
      )
      .gt("quantity_on_hand", 0),
  ]);

  const loadError =
    kitsResult.error?.message ??
    locationsResult.error?.message ??
    lotsResult.error?.message ??
    null;

  const kits: DispenseKitOption[] = (kitsResult.data ?? []).map((kit) => ({
    id: kit.id,
    name: kit.name,
    description: kit.description,
    defaultLocationId: kit.default_location_id,
    components: (kit.procedure_kit_components ?? []).map((c) => {
      const item = c.items as { item_name: string } | null;
      return {
        id: c.id,
        itemId: c.item_id,
        itemName: item?.item_name ?? "Unknown item",
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
  }));

  const locations: DispenseLocationOption[] = (locationsResult.data ?? []).map(
    (loc) => ({
      id: loc.id,
      locationName: loc.location_name,
      room: loc.room,
    })
  );

  const onHandByKey = await fetchOnHandByLocation(supabase);

  const lots: DispenseLotOption[] = (lotsResult.data ?? []).map((lot) => ({
    lotId: lot.lot_id!,
    itemId: lot.item_id!,
    locationId: lot.location_id!,
    expirationDate: lot.expiration_date,
    receivedDate: lot.received_date ?? "",
    quantityOnHand: Number(lot.quantity_on_hand ?? 0),
    status: lot.status as LotStatus,
  }));

  return {
    canDispense,
    permissionMessage: null,
    kits,
    locations,
    onHandByKey,
    lots,
    loadError,
  };
}

export function getFefoExpiredWarning(
  lots: DispenseLotOption[],
  itemId: string,
  locationId: string
): boolean {
  const itemLots = sortLotsFefo(
    lots
      .filter((l) => l.itemId === itemId && l.locationId === locationId)
      .map((l) => ({
        id: l.lotId,
        expirationDate: l.expirationDate,
        receivedDate: l.receivedDate,
        status: l.status,
        quantityOnHand: l.quantityOnHand,
      }))
  );

  const first = itemLots[0];
  return first?.status === "expired";
}

export function getOnHandForItem(
  onHandByKey: Record<string, number>,
  itemId: string,
  locationId: string
): number {
  return onHandByKey[onHandKey(itemId, locationId)] ?? 0;
}
