"use client";

import { useState, useTransition } from "react";

import { adjustLotAction } from "@/lib/actions/lot-actions";
import {
  ADJUST_LOT_DECREASE_REASONS,
  ADJUST_LOT_INCREASE_REASONS,
  ADJUST_LOT_REASON_LABELS,
  type AdjustLotReasonCode,
} from "@/lib/validation/lot-actions";
import { formatQuantity } from "@/lib/format/inventory";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, FormInput, FormSelect } from "@/components/ui/form-field";

export type AdjustLotTarget = {
  lotId: string;
  itemName: string;
  lotNumber: string | null;
  quantityOnHand: number;
  unitAbbreviation: string | null;
};

type AdjustLotDialogProps = {
  lot: AdjustLotTarget;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export function AdjustLotDialog({ lot, onClose, onSuccess }: AdjustLotDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [increase, setIncrease] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [reasonCode, setReasonCode] = useState<AdjustLotReasonCode>(
    "data_correction_decrease"
  );
  const unit = lot.unitAbbreviation ?? "units";

  const reasons = increase
    ? ADJUST_LOT_INCREASE_REASONS
    : ADJUST_LOT_DECREASE_REASONS;

  const changeDirection = (next: boolean) => {
    setIncrease(next);
    setReasonCode(
      next ? ADJUST_LOT_INCREASE_REASONS[0] : ADJUST_LOT_DECREASE_REASONS[0]
    );
  };

  const submit = () => {
    setError(null);
    if (!quantity.trim() || Number(quantity) <= 0) {
      setError("Enter a quantity greater than zero.");
      return;
    }
    startTransition(async () => {
      const result = await adjustLotAction({
        lotId: lot.lotId,
        quantity: Number(quantity),
        increase,
        reasonCode,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSuccess(`Adjusted stock for ${lot.itemName}.`);
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
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="adjust-title">
        <div className="modal-header">
          <h2 id="adjust-title" className="modal-title">
            Adjust quantity
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

          <FormField id="adjust-direction" label="Direction">
            <FormSelect
              id="adjust-direction"
              value={increase ? "increase" : "decrease"}
              onChange={(event) => changeDirection(event.target.value === "increase")}
              disabled={isPending}
            >
              <option value="decrease">Decrease</option>
              <option value="increase">Increase</option>
            </FormSelect>
          </FormField>

          <FormField id="adjust-quantity" label={`Quantity (${unit})`}>
            <FormInput
              id="adjust-quantity"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              placeholder="0"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              disabled={isPending}
            />
          </FormField>

          <FormField id="adjust-reason" label="Reason">
            <FormSelect
              id="adjust-reason"
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value as AdjustLotReasonCode)}
              disabled={isPending}
            >
              {reasons.map((code) => (
                <option key={code} value={code}>
                  {ADJUST_LOT_REASON_LABELS[code]}
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
            {isPending ? "Working…" : "Save adjustment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
