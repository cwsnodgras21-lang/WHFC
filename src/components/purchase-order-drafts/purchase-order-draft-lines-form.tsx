"use client";

import Link from "next/link";

import { PrintPoDraftButton } from "@/components/purchase-order-drafts/print-po-draft-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { FormInput } from "@/components/ui/form-field";
import { cn } from "@/lib/cn";
import {
  approveDraftAction,
  cancelDraftAction,
  markDraftOrderedAction,
  removeDraftLineAction,
  saveDraftLinesAction,
} from "@/lib/actions/purchase-order-drafts";
import type {
  PurchaseOrderDraftDetail,
  PurchaseOrderDraftLineRow,
} from "@/lib/data/purchase-order-draft-detail";
import {
  formatDateTime,
  formatPurchaseOrderDraftStatus,
  formatQuantity,
  purchaseOrderDraftStatusBadgeVariant,
} from "@/lib/format/inventory";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type PurchaseOrderDraftLinesFormProps = {
  draft: PurchaseOrderDraftDetail;
  initialLines: PurchaseOrderDraftLineRow[];
  canManage: boolean;
};

type LineInputs = {
  quantity: string;
  notes: string;
};

function initialLineInputs(lines: PurchaseOrderDraftLineRow[]): Record<string, LineInputs> {
  const map: Record<string, LineInputs> = {};
  for (const line of lines) {
    map[line.id] = {
      quantity: String(line.quantity),
      notes: line.notes ?? "",
    };
  }
  return map;
}

export function PurchaseOrderDraftLinesForm({
  draft,
  initialLines,
  canManage,
}: PurchaseOrderDraftLinesFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inputs, setInputs] = useState(() => initialLineInputs(initialLines));
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const editable = draft.editable && canManage;
  const canApprove = canManage && draft.status === "draft" && initialLines.length > 0;
  const canMarkOrdered = canManage && draft.status === "approved";
  const canCancel =
    canManage && (draft.status === "draft" || draft.status === "approved");

  const parsedLines = useMemo(() => {
    return initialLines.map((line) => {
      const input = inputs[line.id] ?? { quantity: "", notes: "" };
      const quantity = Number(input.quantity);
      return {
        ...line,
        input,
        parsedQuantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
      };
    });
  }, [initialLines, inputs]);

  function updateLine(lineId: string, patch: Partial<LineInputs>) {
    setInputs((current) => ({
      ...current,
      [lineId]: { ...current[lineId], ...patch },
    }));
  }

  function runAction(action: () => Promise<{ success: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      setServerError(null);
      setSuccessMessage(null);
      const result = await action();
      if (!result.success) {
        setServerError(result.error ?? "Action failed.");
        return;
      }
      setSuccessMessage(success);
      router.refresh();
    });
  }

  function handleSave() {
    const lines = parsedLines
      .filter((line) => line.parsedQuantity != null)
      .map((line) => ({
        lineId: line.id,
        quantity: line.parsedQuantity as number,
        notes: line.input.notes.trim() || null,
      }));

    if (lines.length === 0) {
      setServerError("Enter a positive quantity for at least one line.");
      return;
    }

    runAction(
      () => saveDraftLinesAction({ draftId: draft.id, lines }),
      "Draft lines saved."
    );
  }

  return (
    <div className="space-y-4 po-draft-print-area">
      <div className="po-draft-print-meta hidden print:block">
        <h1 className="text-xl font-semibold">Purchase order draft</h1>
        <p className="text-sm">
          Vendor: {draft.vendorName} · Status:{" "}
          {formatPurchaseOrderDraftStatus(draft.status)} · Generated{" "}
          {formatDateTime(draft.updatedAt)}
        </p>
      </div>

      {serverError ? <Alert variant="error" message={serverError} /> : null}
      {successMessage ? <Alert variant="success" message={successMessage} /> : null}

      <DataTableShell>
        <DataTable className="data-table-compact po-draft-table">
          <thead>
            <tr>
              <th>Item</th>
              <th className="hidden md:table-cell">Location</th>
              <th className="text-right">On hand</th>
              <th className="text-right hidden sm:table-cell">Suggested</th>
              <th className="hidden lg:table-cell">Reason</th>
              <th className="text-right">Order qty</th>
              <th className="hidden xl:table-cell">Notes</th>
              {editable ? <th className="po-draft-no-print" /> : null}
            </tr>
          </thead>
          <tbody>
            {parsedLines.map((line) => (
              <tr key={line.id}>
                <td>
                  <div className="table-cell-stack">
                    <span className="table-cell-primary font-medium">
                      {line.itemName}
                    </span>
                    <span className="table-cell-secondary mono">{line.internalSku}</span>
                  </div>
                </td>
                <td className="hidden md:table-cell">{line.locationName ?? "—"}</td>
                <td className="numeric">
                  {formatQuantity(line.onHand)}{" "}
                  <span className="text-muted text-xs">{line.unitAbbreviation}</span>
                </td>
                <td className="numeric hidden sm:table-cell">
                  {line.suggestedQuantity == null
                    ? "—"
                    : formatQuantity(line.suggestedQuantity)}
                </td>
                <td className="hidden lg:table-cell text-sm text-muted">
                  {line.reorderReason ?? "—"}
                </td>
                <td className="numeric">
                  {editable ? (
                    <FormInput
                      type="number"
                      min="0.001"
                      step="any"
                      inputMode="decimal"
                      value={line.input.quantity}
                      onChange={(event) =>
                        updateLine(line.id, { quantity: event.target.value })
                      }
                      className="w-24 text-right"
                      aria-label={`Order quantity for ${line.itemName}`}
                    />
                  ) : (
                    <>
                      {formatQuantity(line.quantity)}{" "}
                      <span className="text-muted text-xs">{line.unitAbbreviation}</span>
                    </>
                  )}
                </td>
                <td className="hidden xl:table-cell">
                  {editable ? (
                    <textarea
                      value={line.input.notes}
                      onChange={(event) =>
                        updateLine(line.id, { notes: event.target.value })
                      }
                      rows={2}
                      maxLength={500}
                      className={cn("form-input min-w-[12rem]")}
                      aria-label={`Notes for ${line.itemName}`}
                    />
                  ) : (
                    <span className="text-sm text-muted">{line.notes ?? "—"}</span>
                  )}
                </td>
                {editable ? (
                  <td className="po-draft-no-print text-right">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isPending}
                      onClick={() =>
                        runAction(
                          () =>
                            removeDraftLineAction({
                              draftId: draft.id,
                              lineId: line.id,
                            }),
                          "Line removed."
                        )
                      }
                    >
                      Remove
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </DataTable>
      </DataTableShell>

      <div className="flex flex-wrap gap-2 po-draft-no-print">
        {editable ? (
          <Button type="button" variant="primary" disabled={isPending} onClick={handleSave}>
            Save changes
          </Button>
        ) : null}
        {canApprove ? (
          <Button
            type="button"
            variant="primary"
            disabled={isPending}
            onClick={() =>
              runAction(
                () => approveDraftAction({ draftId: draft.id }),
                "Draft approved."
              )
            }
          >
            Approve draft
          </Button>
        ) : null}
        {canMarkOrdered ? (
          <Button
            type="button"
            variant="primary"
            disabled={isPending}
            onClick={() =>
              runAction(
                () => markDraftOrderedAction({ draftId: draft.id }),
                "Marked as ordered."
              )
            }
          >
            Mark ordered
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() =>
              runAction(
                () => cancelDraftAction({ draftId: draft.id }),
                "Draft cancelled."
              )
            }
          >
            Cancel draft
          </Button>
        ) : null}
        <PrintPoDraftButton />
        <Link href="/purchase-order-drafts" className="btn btn-secondary">
          Back to drafts
        </Link>
      </div>
    </div>
  );
}

export function PurchaseOrderDraftDetailHeader({
  draft,
}: {
  draft: PurchaseOrderDraftDetail;
}) {
  return (
    <div className="space-y-2 po-draft-no-print">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="page-header-title">{draft.vendorName}</h1>
        <Badge variant={purchaseOrderDraftStatusBadgeVariant(draft.status)}>
          {formatPurchaseOrderDraftStatus(draft.status)}
        </Badge>
      </div>
      <p className="text-sm text-muted">
        Updated {formatDateTime(draft.updatedAt)} · Created {formatDateTime(draft.createdAt)}
      </p>
      {draft.status === "draft" ? (
        <p className="text-sm text-muted">
          Review quantities and notes, then approve when vendor-ready. Inventory is not
          received until stock is posted through Receive.
        </p>
      ) : null}
      {draft.status === "approved" ? (
        <p className="text-sm text-muted">
          This draft is approved and locked for ordering. Mark ordered after placing the
          purchase with the vendor.
        </p>
      ) : null}
    </div>
  );
}
