"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AdjustLotDialog } from "@/components/expiration-center/adjust-lot-dialog";
import { BulkTransferDialog } from "@/components/expiration-center/bulk-transfer-dialog";
import { DisposeLotDialog } from "@/components/expiration-center/dispose-lot-dialog";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import {
  bulkDisposeLotsAction,
  markLotsReviewedAction,
} from "@/lib/actions/lot-actions";
import type {
  ExpirationLotRow,
  FilterOption,
} from "@/lib/data/expiration-center-page";
import {
  areAllLotsSelected,
  clearLotSelection,
  selectAllLotIds,
  toggleLotSelection,
} from "@/lib/expiration/selection";
import {
  EXPIRATION_URGENCY_BADGE,
  EXPIRATION_URGENCY_LABELS,
  expirationUrgency,
} from "@/lib/lots/expiration";
import {
  formatDate,
  formatDaysUntilExpiration,
  formatQuantity,
} from "@/lib/format/inventory";

type ExpirationLotsTableProps = {
  rows: ExpirationLotRow[];
  locations: FilterOption[];
  canDispose: boolean;
  canAdjust: boolean;
  canTransfer: boolean;
};

/** Left-border accent that carries the urgency color down the row. */
const URGENCY_ACCENT: Record<
  ReturnType<typeof expirationUrgency>,
  string
> = {
  expired: "var(--color-danger)",
  critical: "var(--color-danger)",
  warning: "var(--color-attention)",
  soon: "var(--color-caution)",
  ok: "transparent",
};

export function ExpirationLotsTable({
  rows,
  locations,
  canDispose,
  canAdjust,
  canTransfer,
}: ExpirationLotsTableProps) {
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [disposeLot, setDisposeLot] = useState<ExpirationLotRow | null>(null);
  const [adjustLot, setAdjustLot] = useState<ExpirationLotRow | null>(null);
  const [showBulkTransfer, setShowBulkTransfer] = useState(false);

  const rowIds = useMemo(() => rows.map((row) => row.lotId), [rows]);
  const allSelected = areAllLotsSelected(selected, rowIds);
  const selectedCount = selected.size;
  const selectedLotIds = useMemo(() => Array.from(selected), [selected]);
  const sourceLocationIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of rows) {
      if (selected.has(row.lotId)) ids.add(row.locationId);
    }
    return Array.from(ids);
  }, [rows, selected]);

  const handleSuccess = (text: string) => {
    setDisposeLot(null);
    setAdjustLot(null);
    setMessage(text);
    toast.success(text);
    router.refresh();
  };

  const clearSelection = () => setSelected(clearLotSelection());

  const runBulkDispose = () => {
    startTransition(async () => {
      const ok = await confirm({
        title: "Dispose selected lots?",
        message: `This marks ${selectedCount} lot${selectedCount === 1 ? "" : "s"} as expired disposal and removes remaining on-hand stock.`,
        confirmLabel: "Mark disposed",
        destructive: true,
      });
      if (!ok) return;

      const result = await bulkDisposeLotsAction(selectedLotIds);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.failed > 0) {
        toast.error(result.message);
      } else {
        toast.success(result.message);
      }
      clearSelection();
      router.refresh();
    });
  };

  const runMarkReviewed = () => {
    startTransition(async () => {
      const result = await markLotsReviewedAction(selectedLotIds);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.failed > 0) {
        toast.error(result.message);
      } else {
        toast.success(result.message);
      }
      clearSelection();
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {message ? (
        <Alert variant="success" title="Done" message={message} />
      ) : null}

      {selectedCount > 0 ? (
        <div
          className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2"
          role="toolbar"
          aria-label="Bulk lot actions"
        >
          <span className="mr-2 text-sm font-medium text-[var(--color-fg)]">
            {selectedCount} selected
          </span>
          {canDispose ? (
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={runBulkDispose}
            >
              Mark disposed
            </Button>
          ) : null}
          {canDispose ? (
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={runMarkReviewed}
            >
              Mark reviewed
            </Button>
          ) : null}
          {canTransfer ? (
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => setShowBulkTransfer(true)}
            >
              Transfer selected
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={clearSelection}
          >
            Clear
          </Button>
        </div>
      ) : null}

      <DataTableShell>
        <DataTable responsive>
          <thead>
            <tr>
              <th scope="col" className="w-10">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--color-primary)]"
                  checked={allSelected}
                  aria-label="Select all lots in this view"
                  onChange={() => {
                    setSelected(
                      allSelected ? clearLotSelection() : selectAllLotIds(rowIds)
                    );
                  }}
                />
              </th>
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
            {rows.map((row) => {
              const urgency = expirationUrgency(row.daysUntilExpiration);
              const isSelected = selected.has(row.lotId);
              return (
                <tr key={row.lotId}>
                  <td data-label="">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--color-primary)]"
                      checked={isSelected}
                      aria-label={`Select ${row.itemName}`}
                      onChange={() =>
                        setSelected((current) =>
                          toggleLotSelection(current, row.lotId)
                        )
                      }
                    />
                  </td>
                  <td
                    data-label="Item"
                    style={{
                      boxShadow: `inset 3px 0 0 0 ${URGENCY_ACCENT[urgency]}`,
                    }}
                  >
                    <div className="table-cell-stack">
                      <span className="table-cell-primary">
                        {row.itemName}
                        {row.useFirst ? (
                          <Badge variant="info" className="ml-2 align-middle">
                            Use first
                          </Badge>
                        ) : null}
                      </span>
                      {row.internalSku ? (
                        <span className="table-cell-secondary mono">
                          {row.internalSku}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="muted" data-label="Location">
                    {row.locationName ?? "—"}
                  </td>
                  <td className="mono" data-label="Lot number">
                    {row.lotNumber ?? "—"}
                  </td>
                  <td data-label="Expiration date">
                    <div className="table-cell-stack">
                      <span className="table-cell-primary">
                        {formatDate(row.expirationDate)}
                      </span>
                      <span className="table-cell-secondary">
                        {formatDaysUntilExpiration(row.daysUntilExpiration)}
                      </span>
                    </div>
                  </td>
                  <td className="numeric" data-label="On hand">
                    {formatQuantity(row.quantityOnHand)}
                    {row.unitAbbreviation ? (
                      <span className="chart-unit"> {row.unitAbbreviation}</span>
                    ) : null}
                  </td>
                  <td data-label="Status">
                    <Badge variant={EXPIRATION_URGENCY_BADGE[urgency]}>
                      {EXPIRATION_URGENCY_LABELS[urgency]}
                    </Badge>
                  </td>
                  <td data-label="">
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
              );
            })}
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

      {showBulkTransfer ? (
        <BulkTransferDialog
          lotIds={selectedLotIds}
          locations={locations}
          sourceLocationIds={sourceLocationIds}
          onClose={() => setShowBulkTransfer(false)}
          onSuccess={(text, failed) => {
            setShowBulkTransfer(false);
            if (failed > 0) {
              toast.error(text);
            } else {
              toast.success(text);
            }
            clearSelection();
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
