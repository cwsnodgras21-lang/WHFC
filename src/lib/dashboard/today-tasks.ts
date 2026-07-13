import type { DashboardSummary } from "@/lib/data/dashboard";
import type { ImagingHighlights } from "@/lib/data/imaging-page";
import { isModuleEnabled } from "@/lib/modules/definitions";

/**
 * "Today's Tasks" derivation.
 *
 * This is intentionally NOT a task engine: no tables, no persistence, no
 * lifecycle. Each builder is a pure function that inspects the data the
 * dashboard already computed (`DashboardSummary`) plus the caller's
 * permissions, and returns a single actionable task or `null`. A task is
 * present only while its underlying condition holds, so tasks "complete"
 * themselves the moment the data no longer warrants them.
 *
 * To add a new task type: write one builder and register it in
 * `TASK_BUILDERS`. Nothing else — the card and the dashboard stay untouched.
 */

export type TaskPriority = "critical" | "high" | "medium" | "low";

export type TaskIconKey =
  | "expired"
  | "expiring"
  | "count"
  | "reorder"
  | "low-stock"
  | "po-approve"
  | "imaging-appointment"
  | "imaging-auth"
  | "imaging-overdue";

export type TodayTask = {
  /** Stable id — one task type can only appear once. */
  id: string;
  priority: TaskPriority;
  icon: TaskIconKey;
  title: string;
  /** One sentence describing the work and its scale. */
  description: string;
  ctaLabel: string;
  /** Deep link to the page that resolves the task. */
  href: string;
};

/**
 * Cross-module context the Action Center draws on. Permission flags hide
 * role-gated tasks; `imaging` is present only when the Imaging Log module is
 * enabled and readable, so imaging builders self-disable when it is absent.
 * A new module contributes tasks by adding an optional field here plus a
 * builder below — the card never changes.
 */
export type TodayTaskContext = {
  canManageCounts: boolean;
  canManagePoDrafts: boolean;
  imaging?: ImagingHighlights | null;
};

const PRIORITY_RANK: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

type TaskBuilder = (
  summary: DashboardSummary,
  ctx: TodayTaskContext
) => TodayTask | null;

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

/** Expired stock still counted on hand — a liability, so it outranks everything. */
const buildExpiredStockTask: TaskBuilder = (summary) => {
  const expired = summary.expiration.expired;
  if (expired <= 0) return null;

  return {
    id: "expired-stock",
    priority: "critical",
    icon: "expired",
    title: "Dispose of expired stock",
    description: `${expired} ${plural(expired, "lot is", "lots are")} expired but still counted on hand.`,
    ctaLabel: "Review expired",
    href: "/expiration",
  };
};

/** A physical count left in progress blocks movement at its location. */
const buildOpenCountTask: TaskBuilder = (summary, ctx) => {
  if (!ctx.canManageCounts) return null;
  const open = summary.openPhysicalCountCount;
  if (open <= 0) return null;

  return {
    id: "open-count",
    priority: "high",
    icon: "count",
    title: "Finish inventory count",
    description: `${open} physical ${plural(open, "count is", "counts are")} in progress and waiting to be completed.`,
    ctaLabel: "Finish count",
    href: "/physical-counts",
  };
};

/** Usage-based reorder recommendations (only computed when the module is on). */
const buildReorderTask: TaskBuilder = (summary) => {
  const count = summary.reorderSuggestionCount;
  if (count <= 0) return null;

  const hasStockout = summary.stockHealth.out > 0;
  return {
    id: "reorder-suggestions",
    priority: hasStockout ? "critical" : "high",
    icon: "reorder",
    title: "Review reorder suggestions",
    description: `${count} ${plural(count, "item", "items")} may need ordering based on stock levels and recent usage.`,
    ctaLabel: "Review suggestions",
    href: "/reorder-suggestions",
  };
};

/**
 * Low-stock fallback. When reorder suggestions are enabled that task already
 * covers this work, so this only appears for clinics running without the
 * reorder-suggestions module.
 */
const buildLowStockTask: TaskBuilder = (summary) => {
  if (isModuleEnabled(summary.enabledModules, "reorder_suggestions")) return null;
  const count = summary.belowReorderCount;
  if (count <= 0) return null;

  const hasStockout = summary.stockHealth.out > 0;
  const href = isModuleEnabled(summary.enabledModules, "analytics")
    ? "/reorder-report"
    : "/items";

  return {
    id: "low-stock",
    priority: hasStockout ? "critical" : "high",
    icon: "low-stock",
    title: "Review low stock",
    description: `${count} ${plural(count, "item is", "items are")} at or below the reorder point.`,
    ctaLabel: "Review items",
    href,
  };
};

/** Dated stock approaching expiry — worth pulling/using first, not yet urgent. */
const buildExpiringSoonTask: TaskBuilder = (summary) => {
  const soon = summary.expiration.expiring30;
  if (soon <= 0) return null;

  return {
    id: "expiring-soon",
    priority: "medium",
    icon: "expiring",
    title: "Review expiring inventory",
    description: `${soon} ${plural(soon, "lot expires", "lots expire")} within 30 days.`,
    ctaLabel: "Review expiring",
    href: "/expiration",
  };
};

/** Purchase order drafts waiting on an approver. */
const buildPoApprovalTask: TaskBuilder = (summary, ctx) => {
  if (!ctx.canManagePoDrafts) return null;
  const count = summary.poDraftsAwaitingReviewCount;
  if (count <= 0) return null;

  return {
    id: "po-approval",
    priority: "high",
    icon: "po-approve",
    title: "Approve purchase order drafts",
    description: `${count} purchase order ${plural(count, "draft is", "drafts are")} awaiting review.`,
    ctaLabel: "Review drafts",
    href: "/purchase-order-drafts",
  };
};

/** Imaging appointments scheduled for today — timely, staff-facing work. */
const buildImagingAppointmentsTask: TaskBuilder = (_summary, ctx) => {
  const count = ctx.imaging?.appointmentsToday ?? 0;
  if (count <= 0) return null;

  return {
    id: "imaging-appointments-today",
    priority: "high",
    icon: "imaging-appointment",
    title: "Imaging appointments today",
    description: `${count} imaging ${plural(count, "appointment is", "appointments are")} scheduled for today.`,
    ctaLabel: "View imaging",
    href: "/imaging",
  };
};

/** Imaging orders whose appointment date has passed but are still open. */
const buildImagingOverdueTask: TaskBuilder = (_summary, ctx) => {
  const count = ctx.imaging?.overdueImaging ?? 0;
  if (count <= 0) return null;

  return {
    id: "imaging-overdue",
    priority: "high",
    icon: "imaging-overdue",
    title: "Follow up on overdue imaging",
    description: `${count} imaging ${plural(count, "order is", "orders are")} past the appointment date without a result.`,
    ctaLabel: "Review overdue",
    href: "/imaging",
  };
};

/** Insurance authorizations that still need to be chased. */
const buildImagingAuthTask: TaskBuilder = (_summary, ctx) => {
  const count = ctx.imaging?.pendingAuthorizations ?? 0;
  if (count <= 0) return null;

  return {
    id: "imaging-pending-auth",
    priority: "medium",
    icon: "imaging-auth",
    title: "Chase imaging authorizations",
    description: `${count} imaging ${plural(count, "order is", "orders are")} waiting on insurance authorization.`,
    ctaLabel: "Review authorizations",
    href: "/imaging",
  };
};

/**
 * Registered builders, in tiebreak order. Priority is the primary sort; builder
 * order here breaks ties between tasks of equal priority.
 */
const TASK_BUILDERS: readonly TaskBuilder[] = [
  buildExpiredStockTask,
  buildOpenCountTask,
  buildReorderTask,
  buildLowStockTask,
  buildImagingAppointmentsTask,
  buildImagingOverdueTask,
  buildExpiringSoonTask,
  buildImagingAuthTask,
  buildPoApprovalTask,
];

export function buildTodayTasks(
  summary: DashboardSummary,
  ctx: TodayTaskContext
): TodayTask[] {
  const tasks: TodayTask[] = [];
  for (const build of TASK_BUILDERS) {
    const task = build(summary, ctx);
    if (task) tasks.push(task);
  }
  // Stable sort: equal-priority tasks keep TASK_BUILDERS order.
  return tasks.sort(
    (left, right) => PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority]
  );
}
