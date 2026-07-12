import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import type { PhysicalCountSummary } from "@/lib/data/physical-counts";
import {
  formatDateTime,
  formatPhysicalCountStatus,
  physicalCountStatusBadgeVariant,
} from "@/lib/format/inventory";

type CountHistoryTableProps = {
  counts: PhysicalCountSummary[];
};

export function CountHistoryTable({ counts }: CountHistoryTableProps) {
  if (counts.length === 0) {
    return (
      <EmptyState
        title="No physical counts yet"
        description="Start a count to reconcile on-hand quantities at a location."
      />
    );
  }

  return (
    <DataTableShell>
      <DataTable>
        <thead>
          <tr>
            <th scope="col">Started</th>
            <th scope="col">Location</th>
            <th scope="col">Status</th>
            <th scope="col">Completed</th>
            <th scope="col" className="text-right">
              View
            </th>
          </tr>
        </thead>
        <tbody>
          {counts.map((count) => (
            <tr key={count.id}>
              <td className="muted">{formatDateTime(count.startedAt)}</td>
              <td>{count.locationName}</td>
              <td>
                <Badge variant={physicalCountStatusBadgeVariant(count.status)}>
                  {formatPhysicalCountStatus(count.status)}
                </Badge>
              </td>
              <td className="muted">
                {count.completedAt ? formatDateTime(count.completedAt) : "—"}
              </td>
              <td className="text-right">
                <Link
                  href={`/physical-counts/${count.id}`}
                  className="link-subtle"
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </DataTableShell>
  );
}
