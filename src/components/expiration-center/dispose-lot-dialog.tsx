"use client";

import { useState, useTransition } from "react";

import { disposeLotAction } from "@/lib/actions/lot-actions";
import {
  DISPOSE_REASON_CODES,
  DISPOSE_REASON_LABELS,
  type DisposeReasonCode,
} from "@/lib/validation/lot-actions";
import { formatQuantity } from "@/lib/format/inventory";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, FormInput, FormSelect } from "@/components/ui/form-field";

export type DisposeLotTarget = {
  lotId: string;
  itemName: string;
  lotNumber: string | null;
  quantityOnHand: number;
  unitAbbreviation: string | null;
};

type DisposeLotDialogProps = {
  lot: DisposeLotTarget;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export function DisposeLotDialog({
  lot,
  onClose,
  onSuccess,
}: DisposeLotDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reasonCode, setReasonCode] = useState<DisposeReasonCode>("expired_disposal");
  const unit = lot.unitAbbreviation ?? "units";

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await disposeLotAction({
        lotId: lot.lotId,
        quantity: quantity.trim() ? Number(quantity) : undefined,
        reasonCode,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSuccess(`Disposed stock from ${lot.itemName}.`);
    });
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="dispose-title">
        <div className="modal-header">
          <h2 id="dispose-title" className="modal-title">
            Mark depleted / disposed
          </h2>
          <Button type="button" variant="icon" aria-label="Close" disabled={isPending} onClick={onClose}>
            ×
          </Button>
        </div>
        <div className="modal-body space-y-4">
          {error ? <Alert variant="error" message={error} /> : null}
          <p className="text-sm text-[var(--color-fg-muted)]">
            {lot.itemName}
            {lot.lotNumber ? ` · Lot ${lot.lotNumber}` : ""} — {formatQuantity(lot.quantityOnHand)}{" "}
            {unit} on hand.
          </p>

          <FormField
            id="dispose-quantity"
            label={`Quantity to dispose (${unit})`}
            hint={`Leave blank to dispose the full ${formatQuantity(lot.quantityOnHand)} ${unit}.`}
          >
            <FormInput
              id="dispose-quantity"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              max={lot.quantityOnHand}
              placeholder={formatQuantity(lot.quantityOnHand)}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              disabled={isPending}
            />
          </FormField>

          <FormField id="dispose-reason" label="Reason">
            <FormSelect
              id="dispose-reason"
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value as DisposeReasonCode)}
              disabled={isPending}
            >
              {DISPOSE_REASON_CODES.map((code) => (
                <option key={code} value={code}>
                  {DISPOSE_REASON_LABELS[code]}
                </option>
              ))}
            </FormSelect>
          </FormField>
        </div>
        <div className="modal-footer">
          <Button type="button" variant="secondary" disabled={isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={isPending} onClick={submit}>
            {isPending ? "Working…" : "Dispose"}
          </Button>
        </div>
      </div>
    </div>
  );
}
