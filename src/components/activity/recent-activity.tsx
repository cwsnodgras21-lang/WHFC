"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  CalendarClock,
  ClipboardList,
  FileText,
  Package,
  ScanLine,
  Settings,
  Store,
  type LucideIcon,
} from "lucide-react";

import {
  ACTIVITY_FILTER_MODULES,
  ACTIVITY_MODULE_LABELS,
  type ActivityFeedItem,
} from "@/lib/data/activity-feed";
import type {
  ActivityModule,
  ActivitySeverity,
} from "@/lib/activity/service";
import { formatDateTime } from "@/lib/format/inventory";

/**
 * Platform-level Recent Activity timeline.
 *
 * This component belongs to the platform, not to any single module. It renders
 * whatever the Activity Service has published and NEVER needs changes when a
 * new module is added — new modules simply publish events. The only per-module
 * knowledge here is cosmetic (icon + landing route), and it degrades
 * gracefully for unknown modules.
 */

const MODULE_ICONS: Record<ActivityModule, LucideIcon> = {
  inventory: Package,
  expiration: CalendarClock,
  vendors: Store,
  purchasing: FileText,
  imaging: ScanLine,
  counts: ClipboardList,
  system: Settings,
};

/** Best-effort deep link to the workflow a module's events belong to. */
const MODULE_HREF: Partial<Record<ActivityModule, string>> = {
  inventory: "/transactions",
  expiration: "/expiration",
  vendors: "/administration/vendors",
  purchasing: "/purchase-order-drafts",
  imaging: "/imaging",
  counts: "/physical-counts",
};

const SEVERITY_DOT: Record<ActivitySeverity, string> = {
  info: "var(--color-info)",
  success: "var(--color-success)",
  warning: "var(--color-attention)",
  critical: "var(--color-danger)",
};

type FilterValue = "all" | (typeof ACTIVITY_FILTER_MODULES)[number];

type RecentActivityProps = {
  items: ActivityFeedItem[];
  loadError?: string | null;
  /** Max rows to render per filter view. */
  maxItems?: number;
  title?: string;
};

export function RecentActivity({
  items,
  loadError = null,
  maxItems = 20,
  title = "Recent activity",
}: RecentActivityProps) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const visible = useMemo(() => {
    const filtered =
      filter === "all"
        ? items
        : items.filter((item) => item.module === filter);
    return filtered.slice(0, maxItems);
  }, [items, filter, maxItems]);

  const filters: FilterValue[] = ["all", ...ACTIVITY_FILTER_MODULES];

  return (
    <section aria-labelledby="recent-activity-heading" className="panel">
      <div className="panel-header">
        <h2 id="recent-activity-heading" className="section-heading">
          {title}
        </h2>
      </div>

      <div
        role="tablist"
        aria-label="Filter recent activity"
        className="flex flex-wrap gap-2 px-3 pb-3 pt-1"
      >
        {filters.map((value) => {
          const active = filter === value;
          const label =
            value === "all" ? "All activity" : ACTIVITY_MODULE_LABELS[value];
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(value)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                active
                  ? "border-transparent bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                  : "border-[var(--color-border)] text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-muted)]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loadError ? (
        <p className="px-3 py-6 text-sm text-[var(--color-danger)]">
          Unable to load activity: {loadError}
        </p>
      ) : visible.length === 0 ? (
        <div className="px-3 py-8 text-center">
          <p className="text-base font-medium text-[var(--color-fg)]">
            No activity yet
          </p>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            {filter === "all"
              ? "Operational events from across the clinic will appear here as work happens."
              : `No ${ACTIVITY_MODULE_LABELS[filter as ActivityModule].toLowerCase()} activity in this window.`}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {visible.map((item) => {
            const Icon = MODULE_ICONS[item.module] ?? Activity;
            const href = MODULE_HREF[item.module];
            const moduleLabel = ACTIVITY_MODULE_LABELS[item.module];

            const body = (
              <div className="flex items-start gap-3 px-3 py-3">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-fg-muted)]"
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ background: SEVERITY_DOT[item.severity] }}
                    />
                    <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-fg-muted)]">
                      {moduleLabel}
                    </span>
                    <span className="text-xs text-[var(--color-fg-faint)]">
                      {formatDateTime(item.occurredAt)}
                    </span>
                    {item.actorName ? (
                      <span className="text-xs text-[var(--color-fg-faint)]">
                        · {item.actorName}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate font-medium text-[var(--color-fg)]">
                    {item.title}
                  </p>
                  {item.description ? (
                    <p className="text-sm text-[var(--color-fg-muted)]">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </div>
            );

            return (
              <li key={item.id}>
                {href ? (
                  <Link
                    href={href}
                    className="block hover:bg-[var(--color-surface-muted)]"
                  >
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
