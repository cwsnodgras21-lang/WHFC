import Link from "next/link";

import type { SamplesHighlights } from "@/lib/data/samples";

type SamplesCardProps = {
  summary: SamplesHighlights;
};

export function SamplesCard({ summary }: SamplesCardProps) {
  const hasAttention =
    summary.lowStockCount > 0 ||
    summary.outOfStockCount > 0 ||
    summary.expiredCount > 0;

  return (
    <section aria-labelledby="samples-heading" className="panel">
      <div
        className={`panel-header ${hasAttention ? "panel-header-attention" : "panel-header-success"}`}
      >
        <h2 id="samples-heading" className="section-heading">
          Samples
        </h2>
        <Link href="/samples" className="link-subtle">
          Sample inventory
        </Link>
      </div>

      <div className="grid gap-3 p-3 sm:grid-cols-4">
        <SamplesStat
          label="Out of stock"
          value={summary.outOfStockCount}
          tone={summary.outOfStockCount > 0 ? "danger" : "muted"}
        />
        <SamplesStat
          label="Low stock"
          value={summary.lowStockCount}
          tone={summary.lowStockCount > 0 ? "warning" : "muted"}
        />
        <SamplesStat
          label="Expired lots"
          value={summary.expiredCount}
          tone={summary.expiredCount > 0 ? "danger" : "muted"}
        />
        <SamplesStat
          label="Expiring soon"
          value={summary.expiringCount}
          tone={summary.expiringCount > 0 ? "warning" : "muted"}
        />
      </div>
    </section>
  );
}

type StatTone = "danger" | "warning" | "muted";

function SamplesStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: StatTone;
}) {
  const toneColor =
    tone === "danger"
      ? "text-[var(--color-danger)]"
      : tone === "warning"
        ? "text-[var(--color-attention)]"
        : "text-[var(--color-fg)]";

  return (
    <Link
      href="/samples"
      className="rounded-md border border-[var(--color-border-subtle)] p-3 transition-colors hover:border-[var(--color-border)]"
    >
      <span className="block text-xs font-medium text-[var(--color-fg-muted)]">
        {label}
      </span>
      <span className={`mt-1 block text-2xl font-semibold ${toneColor}`}>
        {value}
      </span>
    </Link>
  );
}
