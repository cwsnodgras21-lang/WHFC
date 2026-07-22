import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import type { TransactionHistoryRow } from "@/lib/data/transactions-page";
import {
  formatDateTime,
  formatLocationDetail,
  formatSignedQuantityWithUnit,
  formatTransactionType,
} from "@/lib/format/inventory";
import {
  formatReasonCode,
  isPhysicalCountCorrectionReason,
} from "@/lib/format/reason-codes";
import { isTransferTransactionType } from "@/lib/transactions/transfer-pairing";

type TransactionsTableProps = {
  transactions: TransactionHistoryRow[];
};

function transactionTypeBadgeVariant(
  transactionType: TransactionHistoryRow["transaction_type"],
  reasonCode: TransactionHistoryRow["reason_code"]
): "default" | "info" | "warning" | "success" | "danger" {
  if (transactionType === "PHYSICAL_COUNT_CORRECTION") {
    return reasonCode === "count_surplus" ? "success" : "warning";
  }
  if (isTransferTransactionType(transactionType)) {
    return "info";
  }
  if (transactionType === "RECEIVE") {
    return "success";
  }
  if (transactionType === "CONSUME") {
    return "danger";
  }
  return "default";
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  return (
    <DataTableShell>
      <DataTable>
        <thead>
          <tr>
            <th scope="col">Date / time</th>
            <th scope="col">Item</th>
            <th scope="col" className="hidden lg:table-cell">
              Location
            </th>
            <th scope="col" className="hidden md:table-cell">
              Type
            </th>
            <th scope="col" className="hidden xl:table-cell">
              Reason
            </th>
            <th scope="col" className="text-right">
              Quantity
            </th>
            <th scope="col" className="hidden sm:table-cell">
              Performed by
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((row) => {
            const location = formatLocationDetail(row.location_name);
            const countCorrection =
              row.transaction_type === "PHYSICAL_COUNT_CORRECTION";

            return (
              <tr key={row.id ?? `${row.occurred_at}-${row.transaction_type}`}>
                <td className="muted whitespace-nowrap">
                  {formatDateTime(row.occurred_at)}
                </td>
                <td>
                  <div className="table-cell-stack">
                    <span className="table-cell-primary">
                      {row.item_name ?? "—"}
                    </span>
                    {row.internal_sku ? (
                      <span className="table-cell-secondary mono">
                        {row.internal_sku}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="hidden lg:table-cell">
                  <div className="table-cell-stack">
                    <span className="table-cell-primary">{location.primary}</span>
                    {location.secondary ? (
                      <span className="table-cell-secondary">
                        {location.secondary}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="hidden md:table-cell">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={transactionTypeBadgeVariant(
                        row.transaction_type,
                        row.reason_code
                      )}
                    >
                      {formatTransactionType(row.transaction_type)}
                    </Badge>
                    {countCorrection ? (
                      <Badge variant="warning">Physical count</Badge>
                    ) : null}
                  </div>
                </td>
                <td className="hidden xl:table-cell">
                  <span
                    className={
                      isPhysicalCountCorrectionReason(row.reason_code)
                        ? "font-medium"
                        : undefined
                    }
                  >
                    {formatReasonCode(row.reason_code)}
                  </span>
                </td>
                <td className="numeric whitespace-nowrap font-medium">
                  {formatSignedQuantityWithUnit(
                    row.quantity,
                    row.transaction_type,
                    row.reason_code,
                    row.unit_abbreviation
                  )}
                </td>
                <td className="hidden sm:table-cell">
                  {row.performed_by_name?.trim() || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
    </DataTableShell>
  );
}
