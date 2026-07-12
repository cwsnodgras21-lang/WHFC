import { cn } from "@/lib/cn";

type MetricCardProps = {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "warning" | "success";
  className?: string;
};

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
  className,
}: MetricCardProps) {
  return (
    <article
      className={cn(
        "metric-card",
        tone === "warning" && "metric-card-warning",
        tone === "success" && "metric-card-success",
        className
      )}
    >
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-fg-faint)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 text-2xl font-semibold tabular-nums leading-none text-[var(--color-fg)]",
          tone === "warning" && "text-[var(--color-attention)]",
          tone === "success" && "text-[var(--color-success)]"
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-xs text-[var(--color-fg-muted)]">{hint}</p>
      ) : null}
    </article>
  );
}

export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("metric-card animate-pulse", className)}>
      <div className="h-3 w-20 rounded bg-[var(--color-border-subtle)]" />
      <div className="mt-3 h-7 w-14 rounded bg-[var(--color-border-subtle)]" />
      <div className="mt-2 h-3 w-28 rounded bg-[var(--color-border-subtle)]" />
    </div>
  );
}
