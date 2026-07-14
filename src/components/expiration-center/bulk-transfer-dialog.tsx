"use client";

import { useMemo, useState, useTransition } from "react";

import { bulkTransferLotsAction } from "@/lib/actions/lot-actions";
import type { FilterOption } from "@/lib/data/expiration-center-page";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, FormSelect } from "@/components/ui/form-field";

type BulkTransferDialogProps = {
  lotIds: string[];
  locations: FilterOption[];
  /** Location ids that appear in the selection (to avoid same-location picks). */
  sourceLocationIds: string[];
  onClose: () => void;
  onSuccess: (message: string, failed: number) => void;
};

export function BulkTransferDialog({
  lotIds,
  locations,
  sourceLocationIds,
  onClose,
  onSuccess,
}: BulkTransferDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [toLocationId, setToLocationId] = useState("");

  const destinations = useMemo(() => {
    const sources = new Set(sourceLocationIds);
    // Prefer destinations that are not the only source; still list all others.
    return locations.filter((location) => {
      if (sources.size === 1 && sources.has(location.id)) return false;
      return true;
    });
  }, [locations, sourceLocationIds]);

  const submit = () => {
    setError(null);
    if (!toLocationId) {
      setError("Select a destination location.");
      return;
    }
    startTransition(async () => {
      const result = await bulkTransferLotsAction(lotIds, toLocationId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSuccess(result.message, result.failed);
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
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-transfer-title"
      >
        <div className="modal-header">
          <h2 id="bulk-transfer-title" className="modal-title">
            Transfer selected lots
          </h2>
          <Button
            type="button"
            variant="icon"
            aria-label="Close"
            disabled={isPending}
            onClick={onClose}
          >
            ×
          </Button>
        </div>
        <div className="modal-body space-y-4">
          {error ? <Alert variant="error" message={error} /> : null}
          <p className="text-sm text-[var(--color-fg-muted)]">
            Moves each selected lot&apos;s on-hand quantity to the destination.
            Stock at the source location is pulled earliest-expiring first
            (FEFO), which matches typical expiration-center selections.
          </p>
          <p className="text-sm text-[var(--color-fg-muted)]">
            {lotIds.length} lot{lotIds.length === 1 ? "" : "s"} selected.
          </p>
          <FormField id="bulk-transfer-destination" label="Destination">
            <FormSelect
              id="bulk-transfer-destination"
              value={toLocationId}
              onChange={(event) => setToLocationId(event.target.value)}
              disabled={isPending || destinations.length === 0}
            >
              <option value="">Select a location…</option>
              {destinations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </FormSelect>
          </FormField>
          {destinations.length === 0 ? (
            <Alert
              variant="error"
              message="No other active locations are available as a destination."
            />
          ) : null}
        </div>
        <div className="modal-footer">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending || !toLocationId}
            onClick={submit}
          >
            {isPending ? "Transferring…" : "Transfer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
