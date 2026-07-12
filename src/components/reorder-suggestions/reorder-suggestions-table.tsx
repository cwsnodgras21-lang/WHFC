"use client";

import { Fragment, useState, useTransition } from "react";

import {
  createPoDraftAction,
  dismissSuggestionAction,
  reviewSuggestionAction,
} from "@/lib/actions/reorder-suggestions";
import {
  REORDER_REASON_LABELS,
  type ReorderSuggestion,
} from "@/lib/reorder-suggestions/calculate";
import { formatQuantity } from "@/lib/format/inventory";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableShell } from "@/components/ui/data-table";

type ReorderSuggestionsTableProps = {
  suggestions: ReorderSuggestion[];
  canManage: boolean;
};

export function ReorderSuggestionsTable({
  suggestions,
  canManage,
}: ReorderSuggestionsTableProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function rowKey(row: ReorderSuggestion) {
    return `${row.itemId}:${row.locationId}`;
  }

  function runAction(
    action: () => Promise<{ success: boolean; error?: string }>,
    success: string
  ) {
    startTransition(async () => {
      setServerError(null);
      setSuccessMessage(null);
      const result = await action();
      if (!result.success) {
        setServerError(result.error ?? "Action failed.");
        return;
      }
      setSuccessMessage(success);
    });
  }

  return (
    <div className="space-y-4">
      {serverError ? <Alert variant="error" message={serverError} /> : null}
      {successMessage ? <Alert variant="success" message={successMessage} /> : null}

      <DataTableShell>
        <DataTable className="data-table-compact">
          <thead>
            <tr>
              <th>Item</th>
              <th>Location</th>
              <th className="text-right">On hand</th>
              <th className="text-right hidden md:table-cell">Recent use (30d)</th>
              <th className="text-right hidden lg:table-cell">Days left</th>
              <th className="text-right hidden sm:table-cell">Suggested</th>
              <th>Reason</th>
              <th className="hidden xl:table-cell">Vendor</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {suggestions.map((row) => {
              const key = rowKey(row);
              const expanded = expandedKey === key;

              return (
                <Fragment key={key}>
                  <tr>
                    <td>
                      <div className="table-cell-stack">
                        <span className="table-cell-primary font-medium">
                          {row.itemName}
                        </span>
                        <span className="table-cell-secondary mono">
                          {row.internalSku}
                        </span>
                      </div>
                    </td>
                    <td>{row.locationName}</td>
                    <td className="numeric">
                      {formatQuantity(row.locationAvailableOnHand)}{" "}
                      <span className="text-muted text-xs">{row.unitAbbreviation}</span>
                    </td>
                    <td className="numeric hidden md:table-cell">
                      {formatQuantity(row.locationUsage30Days)}
                    </td>
                    <td className="numeric hidden lg:table-cell">
                      {row.estimatedDaysLeft ?? "—"}
                    </td>
                    <td className="numeric font-medium hidden sm:table-cell">
                      {formatQuantity(row.suggestedReorderQuantity)}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {row.reasons.map((reason) => (
                          <Badge
                            key={reason}
                            variant={
                              reason === "projected_stockout"
                                ? "warning"
                                : reason === "low_stock"
                                  ? "danger"
                                  : "caution"
                            }
                          >
                            {REORDER_REASON_LABELS[reason]}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="hidden xl:table-cell">
                      {row.vendorName ?? "—"}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={isPending}
                          onClick={() => setExpandedKey(expanded ? null : key)}
                        >
                          Math
                        </Button>
                        {canManage ? (
                          <>
                            <Button
                              type="button"
                              variant="primary"
                              disabled={isPending}
                              onClick={() =>
                                runAction(
                                  () =>
                                  createPoDraftAction({
                                    itemId: row.itemId,
                                    locationId: row.locationId,
                                    quantity: row.suggestedReorderQuantity,
                                    vendorId: row.preferredVendorId,
                                    suggestedQuantity: row.suggestedReorderQuantity,
                                    reorderReason: row.reasons
                                      .map((reason) => REORDER_REASON_LABELS[reason])
                                      .join(", "),
                                  }),
                                  "Added to PO draft."
                                )
                              }
                            >
                              PO draft
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={isPending}
                              onClick={() =>
                                runAction(
                                  () =>
                                    reviewSuggestionAction({
                                      itemId: row.itemId,
                                      locationId: row.locationId,
                                    }),
                                  "Marked reviewed."
                                )
                              }
                            >
                              Reviewed
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={isPending}
                              onClick={() =>
                                runAction(
                                  () =>
                                    dismissSuggestionAction({
                                      itemId: row.itemId,
                                      locationId: row.locationId,
                                    }),
                                  "Dismissed for 7 days."
                                )
                              }
                            >
                              Dismiss
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  {expanded ? (
                    <tr>
                      <td colSpan={9}>
                        <div className="rounded-md bg-[var(--color-surface-muted)] p-3 text-sm space-y-1">
                          <p className="font-medium">How this suggestion was calculated</p>
                          <ul className="list-disc pl-5 space-y-0.5 text-muted">
                            {row.mathLines.map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </DataTable>
      </DataTableShell>
    </div>
  );
}
