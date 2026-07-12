import { describe, expect, it } from "vitest";

import {
  aggregateConsumptionByProcedure,
  countDispensesThisWeek,
  countDispensesToday,
  getTopProceduresThisMonth,
  projectItemRunway,
} from "@/lib/dispense/analytics";
import type { DispenseEventRecord, DispenseLineRecord } from "@/lib/dispense/analytics";

const now = new Date("2026-07-08T15:00:00.000Z");

const events: DispenseEventRecord[] = [
  {
    id: "e1",
    performedAt: "2026-07-08T10:00:00.000Z",
    kitId: "k1",
    kitName: "Testosterone Injection",
  },
  {
    id: "e2",
    performedAt: "2026-07-07T10:00:00.000Z",
    kitId: "k1",
    kitName: "Testosterone Injection",
  },
  {
    id: "e3",
    performedAt: "2026-06-15T10:00:00.000Z",
    kitId: "k2",
    kitName: "B12 Injection",
  },
];

const lines: DispenseLineRecord[] = [
  {
    dispenseEventId: "e1",
    performedAt: "2026-07-08T10:00:00.000Z",
    kitId: "k1",
    kitName: "Testosterone Injection",
    itemId: "i1",
    itemName: "Testosterone Cypionate",
    quantityConsumed: 0.5,
    unit: "mL",
  },
  {
    dispenseEventId: "e2",
    performedAt: "2026-07-07T10:00:00.000Z",
    kitId: "k1",
    kitName: "Testosterone Injection",
    itemId: "i1",
    itemName: "Testosterone Cypionate",
    quantityConsumed: 1,
    unit: "mL",
  },
];

describe("dispense analytics", () => {
  it("counts dispenses today", () => {
    expect(countDispensesToday(events, now)).toBe(1);
  });

  it("counts dispenses this week", () => {
    expect(countDispensesThisWeek(events, now)).toBe(2);
  });

  it("ranks top procedures for the current month", () => {
    const top = getTopProceduresThisMonth(events, now);
    expect(top[0]?.kitName).toBe("Testosterone Injection");
    expect(top[0]?.dispenseCount).toBe(2);
  });

  it("aggregates consumption by procedure", () => {
    const totals = aggregateConsumptionByProcedure(lines);
    expect(totals[0]?.kitName).toBe("Testosterone Injection");
    expect(totals[0]?.totalQuantity).toBe(1.5);
  });

  it("projects item runway from recent dispense usage", () => {
    const onHand = new Map([["i1", 3]]);
    const meta = new Map([
      ["i1", { itemName: "Testosterone Cypionate", unitAbbreviation: "mL" }],
    ]);

    const runway = projectItemRunway(lines, onHand, meta, {
      endDate: now,
      days: 30,
    });

    expect(runway[0]?.projectedDaysRemaining).toBe(60);
  });
});
