export type DispenseEventRecord = {
  id: string;
  performedAt: string;
  kitId: string;
  kitName: string;
};

export type DispenseLineRecord = {
  dispenseEventId: string;
  performedAt: string;
  kitId: string;
  kitName: string;
  itemId: string;
  itemName: string;
  quantityConsumed: number;
  unit: string;
};

export type ProcedureUsage = {
  kitId: string;
  kitName: string;
  dispenseCount: number;
};

export type ProcedureConsumption = {
  kitId: string;
  kitName: string;
  totalQuantity: number;
};

export type ItemRunwayProjection = {
  itemId: string;
  itemName: string;
  unitAbbreviation: string | null;
  onHand: number;
  consumedLast30Days: number;
  dailyBurnRate: number;
  projectedDaysRemaining: number | null;
};

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

export function isOnOrAfter(iso: string, startIso: string): boolean {
  return iso >= startIso;
}

export function isBeforeDay(iso: string, endExclusive: Date): boolean {
  return iso < endExclusive.toISOString();
}

/** Dispense events on the current UTC calendar day. */
export function countDispensesToday(
  events: readonly DispenseEventRecord[],
  now: Date
): number {
  const dayStart = startOfUtcDay(now).toISOString();
  const dayEnd = new Date(startOfUtcDay(now));
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  return events.filter(
    (event) =>
      isOnOrAfter(event.performedAt, dayStart) &&
      isBeforeDay(event.performedAt, dayEnd)
  ).length;
}

/** Dispense events since Monday 00:00 UTC of the current week. */
export function countDispensesThisWeek(
  events: readonly DispenseEventRecord[],
  now: Date
): number {
  const start = startOfUtcDay(now);
  const day = start.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setUTCDate(start.getUTCDate() - diff);
  const weekStart = start.toISOString();

  return events.filter((event) => isOnOrAfter(event.performedAt, weekStart))
    .length;
}

/** Top kits by dispense count within the trailing calendar month (UTC). */
export function getTopProceduresThisMonth(
  events: readonly DispenseEventRecord[],
  now: Date,
  limit = 5
): ProcedureUsage[] {
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();

  const counts = new Map<string, ProcedureUsage>();

  for (const event of events) {
    if (!isOnOrAfter(event.performedAt, monthStart)) {
      continue;
    }
    const existing = counts.get(event.kitId);
    if (existing) {
      existing.dispenseCount += 1;
    } else {
      counts.set(event.kitId, {
        kitId: event.kitId,
        kitName: event.kitName,
        dispenseCount: 1,
      });
    }
  }

  return [...counts.values()]
    .sort((left, right) => {
      const byCount = right.dispenseCount - left.dispenseCount;
      if (byCount !== 0) return byCount;
      return left.kitName.localeCompare(right.kitName, undefined, {
        sensitivity: "base",
      });
    })
    .slice(0, limit);
}

/** Total inventory quantity consumed per procedure kit (all time in window). */
export function aggregateConsumptionByProcedure(
  lines: readonly DispenseLineRecord[],
  limit = 5
): ProcedureConsumption[] {
  const totals = new Map<string, ProcedureConsumption>();

  for (const line of lines) {
    const existing = totals.get(line.kitId);
    if (existing) {
      existing.totalQuantity += line.quantityConsumed;
    } else {
      totals.set(line.kitId, {
        kitId: line.kitId,
        kitName: line.kitName,
        totalQuantity: line.quantityConsumed,
      });
    }
  }

  return [...totals.values()]
    .sort((left, right) => {
      const byQty = right.totalQuantity - left.totalQuantity;
      if (byQty !== 0) return byQty;
      return left.kitName.localeCompare(right.kitName, undefined, {
        sensitivity: "base",
      });
    })
    .slice(0, limit);
}

/**
 * Estimate days until stockout from dispense-driven consumption over the last
 * 30 UTC days. Items with no recent dispense usage are omitted.
 */
export function projectItemRunway(
  lines: readonly DispenseLineRecord[],
  onHandByItem: ReadonlyMap<string, number>,
  itemMeta: ReadonlyMap<
    string,
    { itemName: string; unitAbbreviation: string | null }
  >,
  options: { endDate: Date; days?: number },
  limit = 5
): ItemRunwayProjection[] {
  const windowDays = options.days ?? 30;
  const windowStart = new Date(startOfUtcDay(options.endDate));
  windowStart.setUTCDate(windowStart.getUTCDate() - (windowDays - 1));
  const windowStartIso = windowStart.toISOString();

  const consumed = new Map<string, number>();

  for (const line of lines) {
    if (!isOnOrAfter(line.performedAt ?? "", windowStartIso)) {
      continue;
    }
    consumed.set(
      line.itemId,
      (consumed.get(line.itemId) ?? 0) + line.quantityConsumed
    );
  }

  const projections: ItemRunwayProjection[] = [];

  for (const [itemId, totalConsumed] of consumed) {
    if (totalConsumed <= 0) continue;

    const meta = itemMeta.get(itemId);
    if (!meta) continue;

    const onHand = onHandByItem.get(itemId) ?? 0;
    const dailyBurnRate = totalConsumed / windowDays;
    const projectedDaysRemaining =
      onHand <= 0 ? 0 : Math.floor(onHand / dailyBurnRate);

    projections.push({
      itemId,
      itemName: meta.itemName,
      unitAbbreviation: meta.unitAbbreviation,
      onHand,
      consumedLast30Days: totalConsumed,
      dailyBurnRate,
      projectedDaysRemaining,
    });
  }

  return projections
    .sort((left, right) => {
      const leftDays = left.projectedDaysRemaining ?? Number.MAX_SAFE_INTEGER;
      const rightDays = right.projectedDaysRemaining ?? Number.MAX_SAFE_INTEGER;
      if (leftDays !== rightDays) return leftDays - rightDays;
      return left.itemName.localeCompare(right.itemName, undefined, {
        sensitivity: "base",
      });
    })
    .slice(0, limit);
}

export function hasDispenseAnalytics(
  dispensesToday: number,
  dispensesThisWeek: number,
  topProcedures: readonly ProcedureUsage[]
): boolean {
  return dispensesToday > 0 || dispensesThisWeek > 0 || topProcedures.length > 0;
}
