import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatQuantity } from "@/lib/format/inventory";
import {
  REORDER_REASON_LABELS,
  type ReorderSuggestion,
} from "@/lib/reorder-suggestions/calculate";

type ReorderSuggestionsCardProps = {
  count: number;
  suggestions: ReorderSuggestion[];
};

export function ReorderSuggestionsCard({
  count,
  suggestions,
}: ReorderSuggestionsCardProps) {
  const hasSuggestions = count > 0;

  return (
    <section aria-labelledby="reorder-suggestions-heading" className="panel">
      <div
        className={`panel-header ${hasSuggestions ? "panel-header-attention" : "panel-header-success"}`}
      >
        <h2 id="reorder-suggestions-heading" className="section-heading">
          Items to reorder
        </h2>
        <div className="flex items-center gap-3">
          {hasSuggestions ? (
            <Badge variant="warning">
              {count} {count === 1 ? "suggestion" : "suggestions"}
            </Badge>
          ) : (
            <Badge variant="success">All clear</Badge>
          )}
          <Link href="/reorder-suggestions" className="link-subtle">
            View suggestions
          </Link>
        </div>
      </div>

      {hasSuggestions ? (
        <DataTableShell>
          <DataTable className="data-table-compact">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col" className="hidden sm:table-cell">
                  Location
                </th>
                <th scope="col" className="text-right">
                  On hand
                </th>
                <th scope="col" className="text-right hidden md:table-cell">
                  Days left
                </th>
                <th scope="col" className="text-right">
                  Suggested
                </th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((row) => (
                <tr key={`${row.itemId}:${row.locationId}`}>
                  <td>
                    <div className="table-cell-stack">
                      <span className="table-cell-primary">{row.itemName}</span>
                      <span className="table-cell-secondary text-xs">
                        {row.reasons
                          .map((reason) => REORDER_REASON_LABELS[reason])
                          .join(" · ")}
                      </span>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell">{row.locationName}</td>
                  <td className="numeric">
                    {formatQuantity(row.locationAvailableOnHand)}
                    {row.unitAbbreviation ? (
                      <span className="chart-unit"> {row.unitAbbreviation}</span>
                    ) : null}
                  </td>
                  <td className="numeric hidden md:table-cell">
                    {row.estimatedDaysLeft ?? "—"}
                  </td>
                  <td className="numeric font-medium">
                    +{formatQuantity(row.suggestedReorderQuantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          {count > suggestions.length ? (
            <p className="px-3 pb-3 text-sm text-muted">
              Showing top {suggestions.length} of {count}.{" "}
              <Link href="/reorder-suggestions" className="link-subtle">
                See all
              </Link>
            </p>
          ) : null}
        </DataTableShell>
      ) : (
        <EmptyState
          title="No reorder suggestions"
          description="Usage-based recommendations appear when stock is low, a stockout is projected, or lots are expiring."
        />
      )}
    </section>
  );
}
