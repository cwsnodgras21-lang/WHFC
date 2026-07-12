import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageSection } from "@/components/ui/page-section";
import { SummaryStats } from "@/components/ui/summary-stats";
import type { PurchaseOrderDraftsPageData } from "@/lib/data/purchase-order-drafts-page";
import {
  formatDateTime,
  formatPurchaseOrderDraftStatus,
  formatQuantity,
  purchaseOrderDraftStatusBadgeVariant,
} from "@/lib/format/inventory";

type PurchaseOrderDraftsPageContentProps = {
  data: PurchaseOrderDraftsPageData;
};

export function PurchaseOrderDraftsPageContent({
  data,
}: PurchaseOrderDraftsPageContentProps) {
  if (!data.canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Purchase order drafts"
          description="Review vendor-grouped purchase drafts before ordering."
        />
        <ErrorState
          title="Access denied"
          message={
            data.permissionMessage ??
            "Your account cannot view purchase order drafts."
          }
        />
      </div>
    );
  }

  const totalDrafts = data.groups.reduce(
    (sum, group) => sum + group.drafts.length,
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase order drafts"
        description="Clean, vendor-ready purchase drafts built from reorder suggestions. Approve when ready, mark ordered after placing with the vendor. Does not email vendors or receive inventory."
        actions={
          <Link href="/reorder-suggestions" className="btn btn-secondary">
            Reorder suggestions
          </Link>
        }
      />

      <SummaryStats
        aria-label="Purchase order draft summary"
        stats={[
          {
            label: "Awaiting review",
            value: data.awaitingReviewCount,
            hint: "Draft status",
            tone: data.awaitingReviewCount > 0 ? "attention" : "success",
          },
          {
            label: "Approved",
            value: data.approvedCount,
            hint: "Ready to place with vendor",
          },
          {
            label: "Active drafts",
            value: totalDrafts,
            hint: "Excludes cancelled",
          },
        ]}
      />

      {data.loadError ? (
        <ErrorState
          title="Unable to load purchase order drafts"
          message={data.loadError}
        />
      ) : data.groups.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            title="No purchase order drafts yet"
            description="Add lines from Reorder Suggestions using Create PO draft. Drafts group automatically by preferred vendor."
          />
          <div className="flex justify-center">
            <Link href="/reorder-suggestions" className="btn btn-primary">
              View reorder suggestions
            </Link>
          </div>
        </div>
      ) : (
        data.groups.map((group) => (
          <PageSection
            key={group.vendorId ?? "no-vendor"}
            title={group.vendorName}
            action={
              <span className="text-sm text-muted">
                {group.drafts.length}{" "}
                {group.drafts.length === 1 ? "draft" : "drafts"}
              </span>
            }
          >
            <DataTableShell>
              <DataTable className="data-table-compact">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th className="text-right">Lines</th>
                    <th className="text-right">Total qty</th>
                    <th className="hidden sm:table-cell">Updated</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {group.drafts.map((draft) => (
                    <tr key={draft.id}>
                      <td>
                        <Badge variant={purchaseOrderDraftStatusBadgeVariant(draft.status)}>
                          {formatPurchaseOrderDraftStatus(draft.status)}
                        </Badge>
                      </td>
                      <td className="numeric">{draft.lineCount}</td>
                      <td className="numeric">{formatQuantity(draft.totalQuantity)}</td>
                      <td className="hidden sm:table-cell text-muted">
                        {formatDateTime(draft.updatedAt)}
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/purchase-order-drafts/${draft.id}`}
                          className="link-subtle"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </DataTableShell>
          </PageSection>
        ))
      )}
    </div>
  );
}
