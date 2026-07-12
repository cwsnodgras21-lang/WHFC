import Link from "next/link";

import { ReorderSuggestionsTable } from "@/components/reorder-suggestions/reorder-suggestions-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageSection } from "@/components/ui/page-section";
import { SummaryStats } from "@/components/ui/summary-stats";
import type { ReorderSuggestionsPageData } from "@/lib/data/reorder-suggestions-page";
import { isModuleEnabled } from "@/lib/modules/definitions";
import { formatDateTime, formatQuantity } from "@/lib/format/inventory";
import {
  REORDER_REASON_LABELS,
  type ReorderSuggestionReason,
} from "@/lib/reorder-suggestions/calculate";

type ReorderSuggestionsPageContentProps = {
  data: ReorderSuggestionsPageData;
};

function countByReason(
  suggestions: ReorderSuggestionsPageData["suggestions"],
  reason: ReorderSuggestionReason
): number {
  return suggestions.filter((row) => row.reasons.includes(reason)).length;
}

export function ReorderSuggestionsPageContent({
  data,
}: ReorderSuggestionsPageContentProps) {
  if (!data.canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reorder suggestions"
          description="Purchasing recommendations based on stock on hand, recent usage, and upcoming expirations."
        />
        <ErrorState
          title="Access denied"
          message={
            data.permissionMessage ??
            "Your account cannot view reorder suggestions."
          }
        />
      </div>
    );
  }

  const totalSuggested = data.suggestions.reduce(
    (sum, row) => sum + row.suggestedReorderQuantity,
    0
  );

  const modules = data.enabledModules;
  const showReorderReport = isModuleEnabled(modules, "analytics");
  const showPoDrafts =
    data.canManage && isModuleEnabled(modules, "po_drafts");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reorder suggestions"
        description="What to buy next, with the math shown so you can trust each recommendation."
        actions={
          <div className="flex flex-wrap gap-2">
            {showReorderReport ? (
              <Link href="/reorder-report" className="btn btn-secondary">
                Full reorder report
              </Link>
            ) : null}
            {showPoDrafts && data.draftCount > 0 ? (
              <Link href="/purchase-order-drafts" className="btn btn-secondary">
                {data.draftCount} open PO draft{data.draftCount === 1 ? "" : "s"}
              </Link>
            ) : null}
          </div>
        }
      />

      <p className="text-sm text-muted">
        Updated {formatDateTime(data.generatedAt)}. Based on the last 30 days of
        usage and current stock.
      </p>

      <SummaryStats
        aria-label="Reorder suggestions summary"
        stats={[
          {
            label: "Suggestions",
            value: data.suggestions.length,
            hint: "Item + location rows needing attention",
            tone: data.suggestions.length > 0 ? "attention" : "success",
          },
          {
            label: "Low stock",
            value: countByReason(data.suggestions, "low_stock"),
            hint: REORDER_REASON_LABELS.low_stock,
          },
          {
            label: "Projected stockout",
            value: countByReason(data.suggestions, "projected_stockout"),
            hint: "≤14 days at current usage",
          },
          {
            label: "Expiring lots",
            value: countByReason(data.suggestions, "expiring_soon"),
            hint: REORDER_REASON_LABELS.expiring_soon,
          },
        ]}
      />

      {data.loadError ? (
        <ErrorState
          title="Unable to load reorder suggestions"
          message={data.loadError}
        />
      ) : (
        <PageSection
          id="reorder-suggestions-table"
          title="Items to reorder"
          action={
            data.suggestions.length > 0 ? (
              <span className="text-sm text-muted">
                {formatQuantity(totalSuggested)} total suggested units
              </span>
            ) : null
          }
        >
          {data.suggestions.length === 0 ? (
            <EmptyState
              title="No reorder suggestions right now"
              description="Suggestions appear when stock is low, usage projects a stockout, or lots are expiring soon."
            />
          ) : (
            <ReorderSuggestionsTable
              suggestions={data.suggestions}
              canManage={data.canManage}
            />
          )}
        </PageSection>
      )}
    </div>
  );
}
