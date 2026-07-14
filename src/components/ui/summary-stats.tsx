import Link from "next/link";

import { cn } from "@/lib/cn";

export type SummaryStat = {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "attention" | "success";
  /** When set, the whole stat cell navigates to this href. */
  href?: string;
};

type SummaryStatsProps = {
  stats: SummaryStat[];
  className?: string;
  "aria-label"?: string;
};

/**
 * One cohesive summary surface split into hairline-divided stat cells —
 * intentionally not a row of separate floating cards.
 */
export function SummaryStats({
  stats,
  className,
  "aria-label": ariaLabel = "Summary",
}: SummaryStatsProps) {
  return (
    <dl className={cn("summary-band", className)} aria-label={ariaLabel}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            "summary-stat",
            stat.href && "summary-stat-link"
          )}
        >
          {stat.href ? (
            <Link
              href={stat.href}
              className="summary-stat-stretched-link"
              aria-label={`View ${stat.label}`}
            />
          ) : null}
          <dd
            className={cn(
              "summary-stat-value",
              stat.tone === "attention" && "summary-stat-value-attention",
              stat.tone === "success" && "summary-stat-value-success"
            )}
          >
            {stat.value}
          </dd>
          <dt className="summary-stat-label">{stat.label}</dt>
          {stat.hint ? <p className="summary-stat-hint">{stat.hint}</p> : null}
        </div>
      ))}
    </dl>
  );
}

export function SummaryStatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="summary-band" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="summary-stat animate-pulse">
          <div className="h-7 w-12 rounded bg-[var(--color-border-subtle)]" />
          <div className="h-4 w-24 rounded bg-[var(--color-border-subtle)]" />
          <div className="h-3 w-16 rounded bg-[var(--color-border-subtle)]" />
        </div>
      ))}
    </div>
  );
}
