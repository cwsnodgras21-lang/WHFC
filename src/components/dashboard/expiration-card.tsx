import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { formatDaysUntilExpiration, formatQuantity } from "@/lib/format/inventory";
import type { ExpirationSummary } from "@/lib/dashboard/analytics";

type ExpirationCardProps = {
  summary: ExpirationSummary;
  hasExpiration: boolean;
};

export function ExpirationCard({ summary, hasExpiration }: ExpirationCardProps) {
  const hasExpired = summary.expired > 0;

  return (
    <section aria-labelledby="expiration-heading" className="panel">
      <div
        className={`panel-header ${hasExpired ? "panel-header-attention" : "panel-header-success"}`}
      >
        <h2 id="expiration-heading" className="section-heading">
          Expiration
        </h2>
        <Link href="/expiration" className="link-subtle">
          Expiration center
        </Link>
      </div>

      <div className="grid gap-3 p-3 sm:grid-cols-3">
        <ExpirationStat
          label="Expired"
          value={summary.expired}
          tone={hasExpired ? "danger" : "muted"}
          href="/expiration?bucket=expired"
        />
        <ExpirationStat
          label="Expiring in 30 days"
          value={summary.expiring30}
          tone={summary.expiring30 > 0 ? "warning" : "muted"}
          href="/expiration?bucket=expiring_30"
        />
        <ExpirationStat
          label="Expiring in 90 days"
          value={summary.expiring90}
          tone="muted"
          href="/expiration?bucket=expiring_90"
        />
      </div>

      {hasExpiration && summary.topExpiring.length > 0 ? (
        <DataTableShell>
          <DataTable className="data-table-compact">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col" className="hidden sm:table-cell">
                  Location
                </th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">
                  On hand
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.topExpiring.map((lot) => {
                const expired = lot.daysUntilExpiration < 0;
                return (
                  <tr key={lot.lotId}>
                    <td>
                      <span className="table-cell-primary">{lot.itemName}</span>
                    </td>
                    <td className="hidden sm:table-cell muted">
                      {lot.locationName ?? "—"}
                    </td>
                    <td>
                      <Badge variant={expired ? "danger" : "warning"}>
                        {formatDaysUntilExpiration(lot.daysUntilExpiration)}
                      </Badge>
                    </td>
                    <td className="numeric">
                      {formatQuantity(lot.quantityOnHand)}
                      {lot.unitAbbreviation ? (
                        <span className="chart-unit"> {lot.unitAbbreviation}</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        </DataTableShell>
      ) : (
        <p className="px-3 pb-3 text-sm text-[var(--color-fg-muted)]">
          Nothing expiring in the next 90 days.
        </p>
      )}
    </section>
  );
}

type StatTone = "danger" | "warning" | "muted";

function ExpirationStat({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number;
  tone: StatTone;
  href: string;
}) {
  const toneColor =
    tone === "danger"
      ? "text-[var(--color-danger)]"
      : tone === "warning"
        ? "text-[var(--color-attention)]"
        : "text-[var(--color-fg)]";

  return (
    <Link
      href={href}
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
