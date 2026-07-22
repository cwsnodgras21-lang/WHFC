"use client";

import { useState, useTransition } from "react";

import { createPoDraftAction } from "@/lib/actions/reorder-suggestions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import {
  getReorderStockStatusLabel,
} from "@/lib/reorder/calculations";
import type { ReorderReportRow } from "@/lib/reorder/types";
import { formatQuantity } from "@/lib/format/inventory";

type ReorderReportTableProps = {
  rows: ReorderReportRow[];
  canManage: boolean;
};

function stockStatusBadgeVariant(
  status: ReorderReportRow["stockStatus"]
): "danger" | "warning" | "info" {
  switch (status) {
    case "out_of_stock":
      return "danger";
    case "below_reorder":
      return "warning";
    case "at_reorder_point":
      return "info";
  }
}

function formatStockingUnit(row: ReorderReportRow): string {
  if (row.unitAbbreviation && row.unitAbbreviation !== "—") {
    return `${row.unitName} (${row.unitAbbreviation})`;
  }
  return row.unitName;
}

export function ReorderReportTable({ rows, canManage }: ReorderReportTableProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function addToPoDraft(row: ReorderReportRow) {
    setPendingItemId(row.itemId);
    startTransition(async () => {
      setServerError(null);
      setSuccessMessage(null);
      const result = await createPoDraftAction({
        itemId: row.itemId,
        locationId: null,
        quantity: row.suggestedOrderQuantity,
        vendorId: row.preferredVendorId,
        suggestedQuantity: row.suggestedOrderQuantity,
        reorderReason: getReorderStockStatusLabel(row.stockStatus),
      });
      setPendingItemId(null);
      if (!result.success) {
        setServerError(result.error ?? "Could not add to PO draft.");
        return;
      }
      setSuccessMessage(`Added ${row.itemName} to a PO draft.`);
    });
  }

  return (
    <div className="space-y-3">
      {serverError ? (
        <Alert
          variant="error"
          message={serverError}
          className="reorder-report-no-print"
        />
      ) : null}
      {successMessage ? (
        <Alert
          variant="success"
          message={successMessage}
          className="reorder-report-no-print"
        />
      ) : null}

      <DataTableShell>
        <DataTable className="reorder-report-table">
          <thead>
            <tr>
              <th scope="col">Status</th>
              <th scope="col">Item</th>
              <th scope="col" className="hidden md:table-cell">
                Category
              </th>
              <th scope="col" className="hidden lg:table-cell">
                Unit
              </th>
              <th scope="col" className="hidden sm:table-cell">
                Vendor
              </th>
              <th scope="col" className="text-right">
                On hand
              </th>
              <th scope="col" className="text-right hidden md:table-cell">
                Reorder
              </th>
              <th scope="col" className="text-right hidden md:table-cell">
                Par
              </th>
              <th scope="col" className="text-right">
                Suggested order
              </th>
              {canManage ? (
                <th scope="col" className="text-right reorder-report-no-print">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.itemId}>
                <td>
                  <Badge variant={stockStatusBadgeVariant(row.stockStatus)}>
                    {getReorderStockStatusLabel(row.stockStatus)}
                  </Badge>
                </td>
                <td>
                  <div className="table-cell-stack">
                    <span className="table-cell-primary">{row.itemName}</span>
                    <span className="table-cell-secondary mono">
                      {row.internalSku}
                    </span>
                  </div>
                </td>
                <td className="hidden md:table-cell">{row.categoryName}</td>
                <td className="hidden lg:table-cell">{formatStockingUnit(row)}</td>
                <td className="hidden sm:table-cell">
                  {row.vendorName ?? "No preferred vendor"}
                </td>
                <td className="numeric">{formatQuantity(row.totalOnHand)}</td>
                <td className="numeric hidden md:table-cell">
                  {formatQuantity(row.reorderPoint)}
                </td>
                <td className="numeric hidden md:table-cell">
                  {formatQuantity(row.parLevel)}
                </td>
                <td className="numeric font-medium">
                  {formatQuantity(row.suggestedOrderQuantity)}{" "}
                  <span className="text-[var(--color-fg-muted)] font-normal">
                    {row.unitAbbreviation}
                  </span>
                </td>
                {canManage ? (
                  <td className="text-right reorder-report-no-print">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isPending && pendingItemId === row.itemId}
                      onClick={() => addToPoDraft(row)}
                    >
                      PO draft
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </DataTable>
      </DataTableShell>
    </div>
  );
}
