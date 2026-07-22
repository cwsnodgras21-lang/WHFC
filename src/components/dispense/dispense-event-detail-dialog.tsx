"use client";

import { useEffect, useState, useTransition } from "react";

import { getDispenseLedgerAction } from "@/lib/actions/dispense-history";
import { formatAdministeredSummary } from "@/lib/dispense/query";
import type { DispenseHistoryRow } from "@/lib/dispense/query";
import {
  formatDateTime,
  formatLocationDetail,
  formatQuantity,
  formatSignedQuantityWithUnit,
  formatTransactionType,
} from "@/lib/format/inventory";
import type { Database } from "@/lib/types/database";
import {
  DISPENSE_SOURCE_LABELS,
  type DispenseSource,
} from "@/lib/validation/dispense-history-page";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableShell } from "@/components/ui/data-table";

type LedgerRow =
  Database["public"]["Views"]["inventory_transaction_history"]["Row"];

type DispenseEventDetailDialogProps = {
  event: DispenseHistoryRow | null;
  onClose: () => void;
};

export function DispenseEventDetailDialog({
  event,
  onClose,
}: DispenseEventDetailDialogProps) {
  if (!event) {
    return null;
  }

  return <DispenseEventDetailDialogInner event={event} onClose={onClose} />;
}

function DispenseEventDetailDialogInner({
  event,
  onClose,
}: {
  event: DispenseHistoryRow;
  onClose: () => void;
}) {
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      setLedgerError(null);
      const result = await getDispenseLedgerAction(event.transactionGroupId);
      if (!result.success) {
        setLedgerError(result.error);
        setLedgerRows([]);
        return;
      }
      setLedgerRows(result.rows);
    });
  }, [event.transactionGroupId]);

  const location = formatLocationDetail(event.locationName);
  const sourceLabel =
    DISPENSE_SOURCE_LABELS[event.source as DispenseSource] ?? event.source;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) {
          onClose();
        }
      }}
    >
      <div
        className="modal-panel max-w-3xl w-full"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispense-detail-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="dispense-detail-title" className="modal-title">
              {event.kitName}
            </h2>
            <p className="text-sm text-muted mt-1">
              {formatDateTime(event.performedAt)} · {location.primary}
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="modal-body space-y-6">
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-muted">Source</dt>
              <dd className="font-medium">{sourceLabel}</dd>
            </div>
            <div>
              <dt className="text-muted">Recorded by</dt>
              <dd className="font-medium">{event.createdByName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Administered amount</dt>
              <dd className="font-medium">
                {formatAdministeredSummary(event.administeredAmounts)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Transaction group</dt>
              <dd className="font-mono text-xs break-all">
                {event.transactionGroupId}
              </dd>
            </div>
          </dl>

          {event.allowExpiredConsumption ? (
            <Badge variant="warning">Consumed from expired stock</Badge>
          ) : null}

          <section>
            <h3 className="text-sm font-medium mb-2">Inventory decremented</h3>
            <DataTableShell>
              <DataTable className="data-table-compact">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {event.lines.map((line) => (
                    <tr key={line.id}>
                      <td>
                        <div className="table-cell-stack">
                          <span className="table-cell-primary">
                            {line.itemName}
                          </span>
                          {line.internalSku ? (
                            <span className="table-cell-secondary mono">
                              {line.internalSku}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="numeric">
                        {formatQuantity(line.quantityConsumed)} {line.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </DataTableShell>
          </section>

          <section>
            <h3 className="text-sm font-medium mb-2">Linked ledger entries</h3>
            {ledgerError ? (
              <Alert variant="error" message={ledgerError} />
            ) : isPending ? (
              <p className="text-sm text-muted">Loading ledger entries…</p>
            ) : ledgerRows.length === 0 ? (
              <p className="text-sm text-muted">No ledger entries found.</p>
            ) : (
              <DataTableShell>
                <DataTable className="data-table-compact">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Item</th>
                      <th>Type</th>
                      <th className="text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerRows.map((row) => (
                      <tr key={row.id ?? `${row.occurred_at}-${row.item_id}`}>
                        <td className="muted whitespace-nowrap">
                          {formatDateTime(row.occurred_at)}
                        </td>
                        <td>{row.item_name ?? "—"}</td>
                        <td>{formatTransactionType(row.transaction_type)}</td>
                        <td className="numeric">
                          {formatSignedQuantityWithUnit(
                            row.quantity,
                            row.transaction_type,
                            row.reason_code,
                            row.unit_abbreviation
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </DataTableShell>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
