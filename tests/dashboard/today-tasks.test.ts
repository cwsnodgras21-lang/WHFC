import { describe, expect, it } from "vitest";

import type { DashboardSummary } from "@/lib/data/dashboard";
import { buildTodayTasks } from "@/lib/dashboard/today-tasks";
import { getDefaultOrganizationModules } from "@/lib/modules/definitions";
import type { OrganizationModules } from "@/lib/modules/types";

function makeSummary(
  overrides: Partial<DashboardSummary> = {},
  modules?: Partial<OrganizationModules>
): DashboardSummary {
  return {
    activeItems: 10,
    activeLocations: 2,
    belowReorderCount: 0,
    recentActivityCount: 0,
    stockHealth: { healthy: 10, low: 0, out: 0, total: 10 },
    replenishment: [],
    movement: [],
    hasMovement: false,
    needsAttention: [],
    expiration: { expired: 0, expiring30: 0, expiring90: 0, topExpiring: [] },
    hasExpiration: false,
    recentTransactions: [],
    dispensesToday: 0,
    dispensesThisWeek: 0,
    topProceduresThisMonth: [],
    consumptionByProcedure: [],
    itemRunway: [],
    hasDispenseAnalytics: false,
    reorderSuggestionCount: 0,
    reorderSuggestions: [],
    poDraftsAwaitingReviewCount: 0,
    poDraftsAwaitingReview: [],
    openPhysicalCountCount: 0,
    enabledModules: { ...getDefaultOrganizationModules(), ...modules },
    gettingStarted: {
      steps: [],
      completedCount: 0,
      applicableCount: 0,
      isComplete: true,
    },
    errors: [],
    ...overrides,
  };
}

const MANAGER = { canManageCounts: true, canManagePoDrafts: true };

describe("buildTodayTasks", () => {
  it("returns no tasks when nothing needs attention", () => {
    expect(buildTodayTasks(makeSummary(), MANAGER)).toEqual([]);
  });

  it("surfaces reorder suggestions when present", () => {
    const tasks = buildTodayTasks(
      makeSummary({ reorderSuggestionCount: 7 }),
      MANAGER
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: "reorder-suggestions",
      priority: "high",
      href: "/reorder-suggestions",
    });
  });

  it("escalates the reorder task to critical when an item is out of stock", () => {
    const tasks = buildTodayTasks(
      makeSummary({
        reorderSuggestionCount: 3,
        stockHealth: { healthy: 8, low: 1, out: 1, total: 10 },
      }),
      MANAGER
    );
    expect(tasks[0].priority).toBe("critical");
  });

  it("orders tasks by priority, most urgent first", () => {
    const tasks = buildTodayTasks(
      makeSummary({
        reorderSuggestionCount: 2,
        openPhysicalCountCount: 1,
        expiration: { expired: 1, expiring30: 4, expiring90: 0, topExpiring: [] },
        poDraftsAwaitingReviewCount: 1,
      }),
      MANAGER
    );
    expect(tasks.map((t) => t.id)).toEqual([
      "expired-stock", // critical
      "open-count", // high
      "reorder-suggestions", // high
      "po-approval", // high
      "expiring-soon", // medium
    ]);
  });

  it("hides role-gated tasks from users without permission", () => {
    const summary = makeSummary({
      openPhysicalCountCount: 1,
      poDraftsAwaitingReviewCount: 2,
    });
    const tasks = buildTodayTasks(summary, {
      canManageCounts: false,
      canManagePoDrafts: false,
    });
    expect(tasks.some((t) => t.id === "open-count")).toBe(false);
    expect(tasks.some((t) => t.id === "po-approval")).toBe(false);
  });

  it("falls back to a low-stock task only when reorder suggestions are disabled", () => {
    const withModule = buildTodayTasks(
      makeSummary({ belowReorderCount: 5, reorderSuggestionCount: 5 }),
      MANAGER
    );
    expect(withModule.some((t) => t.id === "low-stock")).toBe(false);

    const withoutModule = buildTodayTasks(
      makeSummary({ belowReorderCount: 5 }, { reorder_suggestions: false }),
      MANAGER
    );
    expect(withoutModule.map((t) => t.id)).toContain("low-stock");
  });

  it("clears a task as soon as its condition resolves", () => {
    const active = buildTodayTasks(
      makeSummary({
        expiration: { expired: 2, expiring30: 0, expiring90: 0, topExpiring: [] },
      }),
      MANAGER
    );
    expect(active.some((t) => t.id === "expired-stock")).toBe(true);

    const resolved = buildTodayTasks(makeSummary(), MANAGER);
    expect(resolved.some((t) => t.id === "expired-stock")).toBe(false);
  });
});
