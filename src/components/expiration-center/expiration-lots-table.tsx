"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { AdjustLotDialog } from "@/components/expiration-center/adjust-lot-dialog";
import { DisposeLotDialog } from "@/components/expiration-center/dispose-lot-dialog";
import { LOT_STATUS_LABELS, type LotStatus } from "@/lib/lots/expiration";
import {
  formatDate,
  formatDaysUntilExpiration,
  formatQuantity,
} from "@/lib/format/inventory";
import type { ExpirationLotRow } from "@/lib/data/expiration-center-page";

type ExpirationLotsTableProps = {
  rows: ExpirationLotRow[];
  canDispose: boolean;
  canAdjust: boolean;
};

function statusVariant(status: LotStatus): "danger" | "warning" | "default" {
  if (status === "expired") return "danger";
  if (status === "expiring_soon") return "warning";
  return "default";
}

export function ExpirationLotsTable({
  rows,
  canDispose,
  canAdjust,
}: ExpirationLotsTableProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [disposeLot, setDisposeLot] = useState<ExpirationLotRow | null>(null);
  const [adjustLot, setAdjustLot] = useState<ExpirationLotRow | null>(null);

  const handleSuccess = (text: string) => {
    setDisposeLot(null);
    setAdjustLot(null);
    setMessage(text);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {message ? (
        <Alert variant="success" title="Done" message={message} />
      ) : null}

      <DataTableShell>
        <DataTable>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Location</th>
              <th scope="col">Lot number</th>
              <th scope="col">Expiration date</th>
              <th scope="col" className="text-right">
                On hand
              </th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.lotId}>
                <td>
                  <div className="table-cell-stack">
                    <span className="table-cell-primary">{row.itemName}</span>
                    {row.internalSku ? (
                      <span className="table-cell-secondary mono">
                        {row.internalSku}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="muted">
                  {row.locationName ?? "—"}
                  {row.room ? ` · ${row.room}` : ""}
                </td>
                <td className="mono">{row.lotNumber ?? "—"}</td>
                <td>
                  <div className="table-cell-stack">
                    <span className="table-cell-primary">
                      {formatDate(row.expirationDate)}
                    </span>
                    <span className="table-cell-secondary">
                      {formatDaysUntilExpiration(row.daysUntilExpiration)}
                    </span>
                  </div>
                </td>
                <td className="numeric">
                  {formatQuantity(row.quantityOnHand)}
                  {row.unitAbbreviation ? (
                    <span className="chart-unit"> {row.unitAbbreviation}</span>
                  ) : null}
                </td>
                <td>
                  <Badge variant={statusVariant(row.status)}>
                    {LOT_STATUS_LABELS[row.status]}
                  </Badge>
                </td>
                <td>
                  <div className="flex flex-wrap justify-end gap-2">
                    {canDispose ? (
                      <button
                        type="button"
                        className="btn-link text-sm font-medium text-[var(--color-primary)] hover:underline"
                        onClick={() => setDisposeLot(row)}
                      >
                        Dispose
                      </button>
                    ) : null}
                    {canAdjust ? (
                      <button
                        type="button"
                        className="btn-link text-sm font-medium text-[var(--color-primary)] hover:underline"
                        onClick={() => setAdjustLot(row)}
                      >
                        Adjust
                      </button>
                    ) : null}
                    <Link
                      href="/receive"
                      className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                    >
                      Receive
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </DataTableShell>

      {disposeLot ? (
        <DisposeLotDialog
          lot={disposeLot}
          onClose={() => setDisposeLot(null)}
          onSuccess={handleSuccess}
        />
      ) : null}

      {adjustLot ? (
        <AdjustLotDialog
          lot={adjustLot}
          onClose={() => setAdjustLot(null)}
          onSuccess={handleSuccess}
        />
      ) : null}
    </div>
  );
}
