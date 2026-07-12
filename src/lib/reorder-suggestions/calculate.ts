export const USAGE_WINDOW_DAYS = 30;
export const STOCKOUT_WARNING_DAYS = 14;
export const DISMISS_DURATION_DAYS = 7;

export type ReorderSuggestionReason =
  | "low_stock"
  | "projected_stockout"
  | "expiring_soon";

export type ExpiringLotCounts = {
  within30: number;
  within60: number;
  within90: number;
  expiredExcluded: number;
};

export type ItemLocationKey = `${string}:${string}`;

export function itemLocationKey(itemId: string, locationId: string): ItemLocationKey {
  return `${itemId}:${locationId}`;
}

export type ReorderItemMeta = {
  itemId: string;
  itemName: string;
  internalSku: string;
  unitAbbreviation: string;
  reorderPoint: number;
  parLevel: number;
  preferredVendorId: string | null;
  vendorName: string | null;
  trackExpiration: boolean;
};

export type LocationMeta = {
  locationId: string;
  locationName: string;
};

export type LotStockSnapshot = {
  itemId: string;
  locationId: string;
  quantityOnHand: number;
  status: string;
  daysUntilExpiration: number | null;
};

export type UsageSnapshot = {
  itemId: string;
  locationId: string;
  quantity: number;
};

export type SuggestionActionSnapshot = {
  itemId: string;
  locationId: string;
  action: "dismissed" | "reviewed";
  dismissedUntil: string | null;
  createdAt: string;
};

export type ReorderSuggestion = {
  itemId: string;
  locationId: string;
  itemName: string;
  internalSku: string;
  locationName: string;
  unitAbbreviation: string;
  reorderPoint: number;
  parLevel: number;
  locationAvailableOnHand: number;
  totalAvailableOnHand: number;
  rawLocationOnHand: number;
  usage30Days: number;
  locationUsage30Days: number;
  dailyUsage: number;
  estimatedDaysLeft: number | null;
  suggestedReorderQuantity: number;
  preferredVendorId: string | null;
  vendorName: string | null;
  reasons: ReorderSuggestionReason[];
  expiringLotCounts: ExpiringLotCounts;
  mathLines: string[];
};

export function calculateAvailableFromLots(
  lots: readonly LotStockSnapshot[]
): { available: number; raw: number; expiring: ExpiringLotCounts } {
  let available = 0;
  let raw = 0;
  const expiring: ExpiringLotCounts = {
    within30: 0,
    within60: 0,
    within90: 0,
    expiredExcluded: 0,
  };

  for (const lot of lots) {
    raw += lot.quantityOnHand;
    if (lot.status === "depleted" || lot.quantityOnHand <= 0) {
      continue;
    }
    if (lot.status === "expired") {
      expiring.expiredExcluded += lot.quantityOnHand;
      continue;
    }
    available += lot.quantityOnHand;

    const days = lot.daysUntilExpiration;
    if (days !== null && days >= 0) {
      if (days <= 30) expiring.within30 += lot.quantityOnHand;
      else if (days <= 60) expiring.within60 += lot.quantityOnHand;
      else if (days <= 90) expiring.within90 += lot.quantityOnHand;
    }
  }

  return { available, raw, expiring };
}

export function calculateDailyUsage(usage30Days: number, windowDays: number): number {
  if (usage30Days <= 0 || windowDays <= 0) return 0;
  return usage30Days / windowDays;
}

export function calculateEstimatedDaysLeft(
  availableOnHand: number,
  dailyUsage: number
): number | null {
  if (dailyUsage <= 0) return null;
  if (availableOnHand <= 0) return 0;
  return Math.floor(availableOnHand / dailyUsage);
}

export function calculateSuggestedReorderQuantity(
  totalAvailable: number,
  parLevel: number,
  dailyUsage: number
): number {
  const parBased = Math.max(parLevel - totalAvailable, 0);
  if (dailyUsage <= 0) {
    return parBased;
  }
  const thirtyDayTarget = Math.max(Math.ceil(dailyUsage * USAGE_WINDOW_DAYS) - totalAvailable, 0);
  return Math.max(parBased, thirtyDayTarget);
}

export function buildMathLines(input: {
  locationAvailable: number;
  totalAvailable: number;
  locationUsage30: number;
  totalUsage30: number;
  dailyUsage: number;
  daysLeft: number | null;
  reorderPoint: number;
  parLevel: number;
  suggestedQty: number;
  unit: string;
  expiring: ExpiringLotCounts;
}): string[] {
  const lines = [
    `Available at location: ${input.locationAvailable} ${input.unit} (excludes expired/depleted lots)`,
    `Available clinic-wide: ${input.totalAvailable} ${input.unit}`,
    `30-day usage at location: ${input.locationUsage30} ${input.unit}`,
    `30-day usage clinic-wide: ${input.totalUsage30} ${input.unit}`,
  ];

  if (input.dailyUsage > 0) {
    lines.push(
      `Daily usage ≈ ${input.totalUsage30} ÷ ${USAGE_WINDOW_DAYS} = ${input.dailyUsage.toFixed(2)} ${input.unit}/day`
    );
    if (input.daysLeft !== null) {
      lines.push(
        `Estimated days left ≈ ${input.totalAvailable} ÷ ${input.dailyUsage.toFixed(2)} = ${input.daysLeft} days`
      );
    }
  } else {
    lines.push("No recorded usage in the last 30 days — using reorder point / par level.");
  }

  lines.push(`Reorder point: ${input.reorderPoint} ${input.unit} · Par level: ${input.parLevel} ${input.unit}`);
  lines.push(
    `Suggested order = max(par − available, 30-day supply target − available) = ${input.suggestedQty} ${input.unit}`
  );

  if (input.expiring.expiredExcluded > 0) {
    lines.push(
      `Excluded ${input.expiring.expiredExcluded} ${input.unit} in expired lots from available stock`
    );
  }

  return lines;
}

export function deriveReasons(input: {
  totalAvailable: number;
  reorderPoint: number;
  daysLeft: number | null;
  expiring: ExpiringLotCounts;
}): ReorderSuggestionReason[] {
  const reasons: ReorderSuggestionReason[] = [];

  if (input.totalAvailable <= input.reorderPoint) {
    reasons.push("low_stock");
  }
  if (
    input.daysLeft !== null &&
    input.daysLeft <= STOCKOUT_WARNING_DAYS &&
    input.daysLeft >= 0
  ) {
    reasons.push("projected_stockout");
  }
  if (
    input.expiring.within30 > 0 ||
    input.expiring.within60 > 0 ||
    input.expiring.within90 > 0 ||
    input.expiring.expiredExcluded > 0
  ) {
    reasons.push("expiring_soon");
  }

  return reasons;
}

export function shouldShowSuggestion(
  reasons: readonly ReorderSuggestionReason[],
  action: SuggestionActionSnapshot | null,
  now: Date
): boolean {
  if (reasons.length === 0) {
    return false;
  }

  if (!action) {
    return true;
  }

  if (action.action === "dismissed" && action.dismissedUntil) {
    if (new Date(action.dismissedUntil) > now) {
      return false;
    }
  }

  if (action.action === "reviewed") {
    return false;
  }

  return true;
}

export function buildReorderSuggestions(input: {
  items: readonly ReorderItemMeta[];
  locations: readonly LocationMeta[];
  onHandByItemLocation: ReadonlyMap<ItemLocationKey, number>;
  lotsByItemLocation: ReadonlyMap<ItemLocationKey, LotStockSnapshot[]>;
  usageByItemLocation: ReadonlyMap<ItemLocationKey, number>;
  latestActions: ReadonlyMap<ItemLocationKey, SuggestionActionSnapshot>;
  now?: Date;
}): ReorderSuggestion[] {
  const now = input.now ?? new Date();
  const windowDays = USAGE_WINDOW_DAYS;
  const suggestions: ReorderSuggestion[] = [];

  const itemTotals = new Map<string, { available: number; usage: number }>();
  const locationNames = new Map(
    input.locations.map((l) => [l.locationId, l.locationName])
  );

  const keys = new Set<ItemLocationKey>();
  for (const key of input.onHandByItemLocation.keys()) keys.add(key);
  for (const key of input.usageByItemLocation.keys()) keys.add(key);
  for (const key of input.lotsByItemLocation.keys()) keys.add(key);

  for (const key of keys) {
    const [itemId] = key.split(":") as [string, string];
    const item = input.items.find((i) => i.itemId === itemId);
    if (!item) continue;

    const lots = input.lotsByItemLocation.get(key) ?? [];
    const lotCalc =
      lots.length > 0
        ? calculateAvailableFromLots(lots)
        : {
            available: input.onHandByItemLocation.get(key) ?? 0,
            raw: input.onHandByItemLocation.get(key) ?? 0,
            expiring: {
              within30: 0,
              within60: 0,
              within90: 0,
              expiredExcluded: 0,
            },
          };

    const locationUsage = input.usageByItemLocation.get(key) ?? 0;
    const totals = itemTotals.get(itemId) ?? { available: 0, usage: 0 };
    totals.available += lotCalc.available;
    totals.usage += locationUsage;
    itemTotals.set(itemId, totals);
  }

  for (const key of keys) {
    const [itemId, locationId] = key.split(":") as [string, string];
    const item = input.items.find((i) => i.itemId === itemId);
    if (!item) continue;

    const locationName = locationNames.get(locationId) ?? "—";
    const lots = input.lotsByItemLocation.get(key) ?? [];
    const lotCalc =
      lots.length > 0
        ? calculateAvailableFromLots(lots)
        : {
            available: input.onHandByItemLocation.get(key) ?? 0,
            raw: input.onHandByItemLocation.get(key) ?? 0,
            expiring: {
              within30: 0,
              within60: 0,
              within90: 0,
              expiredExcluded: 0,
            },
          };

    const itemTotal = itemTotals.get(itemId) ?? { available: 0, usage: 0 };
    const locationUsage = input.usageByItemLocation.get(key) ?? 0;
    const dailyUsage = calculateDailyUsage(itemTotal.usage, windowDays);
    const daysLeft = calculateEstimatedDaysLeft(itemTotal.available, dailyUsage);
    const suggestedQty = calculateSuggestedReorderQuantity(
      itemTotal.available,
      item.parLevel,
      dailyUsage
    );
    const reasons = deriveReasons({
      totalAvailable: itemTotal.available,
      reorderPoint: item.reorderPoint,
      daysLeft,
      expiring: lotCalc.expiring,
    });

    const action = input.latestActions.get(key) ?? null;
    if (!shouldShowSuggestion(reasons, action, now)) {
      continue;
    }

    suggestions.push({
      itemId: item.itemId,
      locationId,
      itemName: item.itemName,
      internalSku: item.internalSku,
      locationName,
      unitAbbreviation: item.unitAbbreviation,
      reorderPoint: item.reorderPoint,
      parLevel: item.parLevel,
      locationAvailableOnHand: lotCalc.available,
      totalAvailableOnHand: itemTotal.available,
      rawLocationOnHand: lotCalc.raw,
      usage30Days: itemTotal.usage,
      locationUsage30Days: locationUsage,
      dailyUsage,
      estimatedDaysLeft: daysLeft,
      suggestedReorderQuantity: suggestedQty,
      preferredVendorId: item.preferredVendorId,
      vendorName: item.vendorName,
      reasons,
      expiringLotCounts: lotCalc.expiring,
      mathLines: buildMathLines({
        locationAvailable: lotCalc.available,
        totalAvailable: itemTotal.available,
        locationUsage30: locationUsage,
        totalUsage30: itemTotal.usage,
        dailyUsage,
        daysLeft,
        reorderPoint: item.reorderPoint,
        parLevel: item.parLevel,
        suggestedQty,
        unit: item.unitAbbreviation,
        expiring: lotCalc.expiring,
      }),
    });
  }

  return suggestions.sort((left, right) => {
    const leftDays = left.estimatedDaysLeft ?? Number.MAX_SAFE_INTEGER;
    const rightDays = right.estimatedDaysLeft ?? Number.MAX_SAFE_INTEGER;
    if (leftDays !== rightDays) return leftDays - rightDays;
    const byQty = right.suggestedReorderQuantity - left.suggestedReorderQuantity;
    if (byQty !== 0) return byQty;
    return left.itemName.localeCompare(right.itemName);
  });
}

export const REORDER_REASON_LABELS: Record<ReorderSuggestionReason, string> = {
  low_stock: "Low stock",
  projected_stockout: "Projected stockout",
  expiring_soon: "Expiring / expired lots",
};
