import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import type { PurchaseOrderDraftSummary } from "@/lib/data/purchase-order-drafts-page";
import {
  formatDateTime,
  formatQuantity,
} from "@/lib/format/inventory";

type PoDraftsCardProps = {
  count: number;
  drafts: PurchaseOrderDraftSummary[];
  canManage: boolean;
};

export function PoDraftsCard({ count, drafts, canManage }: PoDraftsCardProps) {
  if (!canManage) {
    return null;
  }

  const hasDrafts = count > 0;

  return (
    <section aria-labelledby="po-drafts-heading" className="panel">
      <div
        className={`panel-header ${hasDrafts ? "panel-header-attention" : "panel-header-success"}`}
      >
        <h2 id="po-drafts-heading" className="section-heading">
          PO drafts awaiting review
        </h2>
        <div className="flex items-center gap-3">
          {hasDrafts ? (
            <Badge variant="warning">
              {count} {count === 1 ? "draft" : "drafts"}
            </Badge>
          ) : (
            <Badge variant="success">None pending</Badge>
          )}
          <Link href="/purchase-order-drafts" className="link-subtle">
            View drafts
          </Link>
        </div>
      </div>

      {hasDrafts ? (
        <DataTableShell>
          <DataTable className="data-table-compact">
            <thead>
              <tr>
                <th scope="col">Vendor</th>
                <th scope="col" className="text-right">
                  Lines
                </th>
                <th scope="col" className="text-right hidden sm:table-cell">
                  Total qty
                </th>
                <th scope="col" className="hidden md:table-cell">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((draft) => (
                <tr key={draft.id}>
                  <td>
                    <Link
                      href={`/purchase-order-drafts/${draft.id}`}
                      className="link-subtle font-medium"
                    >
                      {draft.vendorName}
                    </Link>
                  </td>
                  <td className="numeric">{draft.lineCount}</td>
                  <td className="numeric hidden sm:table-cell">
                    {formatQuantity(draft.totalQuantity)}
                  </td>
                  <td className="hidden md:table-cell text-muted">
                    {formatDateTime(draft.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          {count > drafts.length ? (
            <p className="px-3 pb-3 text-sm text-muted">
              Showing {drafts.length} of {count}.{" "}
              <Link href="/purchase-order-drafts" className="link-subtle">
                See all
              </Link>
            </p>
          ) : null}
        </DataTableShell>
      ) : (
        <EmptyState
          title="No drafts awaiting review"
          description="Create PO drafts from reorder suggestions when you are ready to purchase."
        />
      )}
    </section>
  );
}
