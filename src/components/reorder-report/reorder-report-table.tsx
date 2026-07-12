import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import {
  getReorderStockStatusLabel,
} from "@/lib/reorder/calculations";
import type { ReorderReportRow } from "@/lib/reorder/types";
import { formatQuantity } from "@/lib/format/inventory";

type ReorderReportTableProps = {
  rows: ReorderReportRow[];
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

export function ReorderReportTable({ rows }: ReorderReportTableProps) {
  return (
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
            </tr>
          ))}
        </tbody>
      </DataTable>
    </DataTableShell>
  );
}
