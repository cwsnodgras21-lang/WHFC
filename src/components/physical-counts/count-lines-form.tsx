"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  cancelPhysicalCountAction,
  completePhysicalCountAction,
  savePhysicalCountLinesAction,
} from "@/lib/actions/physical-counts";
import type { PhysicalCountLineRow } from "@/lib/data/physical-counts";
import {
  calculateVariance,
  parseCountedQuantityInput,
} from "@/lib/validation/physical-count";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { FormInput } from "@/components/ui/form-field";
import {
  formatDateTime,
  formatPhysicalCountStatus,
  formatQuantity,
  formatVariance,
  physicalCountStatusBadgeVariant,
} from "@/lib/format/inventory";
import { cn } from "@/lib/cn";

type CountLinesFormProps = {
  physicalCountId: string;
  locationLabel: string;
  editable: boolean;
  initialLines: PhysicalCountLineRow[];
};

function lineInputKey(itemId: string): string {
  return itemId;
}

function initialInputs(lines: PhysicalCountLineRow[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of lines) {
    map[lineInputKey(line.itemId)] =
      line.countedQuantity == null ? "" : String(line.countedQuantity);
  }
  return map;
}

export function CountLinesForm({
  physicalCountId,
  locationLabel,
  editable,
  initialLines,
}: CountLinesFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inputs, setInputs] = useState(() => initialInputs(initialLines));
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const displayLines = useMemo(() => {
    return initialLines.map((line) => {
      const raw = inputs[lineInputKey(line.itemId)] ?? "";
      const parsed = parseCountedQuantityInput(raw);
      const variance =
        parsed == null ? null : calculateVariance(parsed, line.systemQuantity);

      return {
        ...line,
        inputValue: raw,
        parsedQuantity: parsed,
        displayVariance: variance,
      };
    });
  }, [initialLines, inputs]);

  const linesToSave = displayLines.filter(
    (line) => line.parsedQuantity != null
  );

  function handleInputChange(itemId: string, value: string) {
    setInputs((prev) => ({ ...prev, [lineInputKey(itemId)]: value }));
  }

  function handleSaveProgress() {
    setServerError(null);
    setSuccessMessage(null);

    if (linesToSave.length === 0) {
      setServerError("Enter at least one counted quantity before saving.");
      return;
    }

    startTransition(async () => {
      const result = await savePhysicalCountLinesAction({
        physicalCountId,
        lines: linesToSave.map((line) => ({
          itemId: line.itemId,
          countedQuantity: line.parsedQuantity as number,
        })),
      });

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      setSuccessMessage(
        `Saved ${result.savedLineCount} counted ${result.savedLineCount === 1 ? "line" : "lines"}.`
      );
      router.refresh();
    });
  }

  function handleComplete() {
    setServerError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await completePhysicalCountAction({ physicalCountId });

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      setSuccessMessage(
        `Count completed. Posted ${result.correctionsPosted} ledger ${result.correctionsPosted === 1 ? "correction" : "corrections"}.`
      );
      router.refresh();
    });
  }

  function handleCancel() {
    setServerError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await cancelPhysicalCountAction({ physicalCountId });

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {successMessage ? (
        <Alert variant="success" message={successMessage} />
      ) : null}
      {serverError ? <Alert variant="error" message={serverError} /> : null}

      <DataTableShell>
        <DataTable>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col" className="text-right">
                System qty
              </th>
              <th scope="col" className="text-right">
                Counted qty
              </th>
              <th scope="col" className="text-right">
                Variance
              </th>
            </tr>
          </thead>
          <tbody>
            {displayLines.map((line) => (
              <tr key={line.itemId}>
                <td>
                  <div className="font-medium text-[var(--color-fg)]">
                    {line.itemName}
                  </div>
                  <div className="text-xs text-[var(--color-fg-muted)]">
                    {line.internalSku} · {line.unitAbbreviation}
                  </div>
                </td>
                <td className="numeric">
                  {formatQuantity(line.systemQuantity)}
                </td>
                <td className="numeric">
                  {editable ? (
                    <FormInput
                      id={`counted-${line.itemId}`}
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      disabled={isPending}
                      value={line.inputValue}
                      onChange={(event) =>
                        handleInputChange(line.itemId, event.target.value)
                      }
                      className="ml-auto max-w-[8rem] text-right"
                      aria-label={`Counted quantity for ${line.itemName}`}
                    />
                  ) : (
                    formatQuantity(line.countedQuantity)
                  )}
                </td>
                <td
                  className={cn(
                    "numeric",
                    line.displayVariance != null &&
                      line.displayVariance > 0 &&
                      "text-[var(--color-success)]",
                    line.displayVariance != null &&
                      line.displayVariance < 0 &&
                      "text-[var(--color-danger)]"
                  )}
                >
                  {editable
                    ? formatVariance(line.displayVariance)
                    : formatVariance(line.variance)}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </DataTableShell>

      {editable ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--color-fg-muted)]">
            Inventory movement at {locationLabel} is blocked while this count is
            in progress.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={handleCancel}
            >
              Cancel count
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={handleSaveProgress}
            >
              {isPending ? "Saving…" : "Save progress"}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isPending}
              onClick={handleComplete}
            >
              {isPending ? "Completing…" : "Complete count"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type PhysicalCountDetailHeaderProps = {
  count: {
    id: string;
    locationName: string;
    room: string | null;
    status: "in_progress" | "completed" | "cancelled";
    startedAt: string;
    completedAt: string | null;
  };
};

export function PhysicalCountDetailHeader({
  count,
}: PhysicalCountDetailHeaderProps) {
  const locationLabel = count.room
    ? `${count.locationName} — ${count.room}`
    : count.locationName;

  return (
    <div className="space-y-3">
      <div>
        <Link href="/physical-counts" className="link-subtle">
          ← Physical counts
        </Link>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-header-title">{locationLabel}</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Started {formatDateTime(count.startedAt)}
            {count.completedAt
              ? ` · Closed ${formatDateTime(count.completedAt)}`
              : null}
          </p>
        </div>
        <Badge variant={physicalCountStatusBadgeVariant(count.status)}>
          {formatPhysicalCountStatus(count.status)}
        </Badge>
      </div>
    </div>
  );
}
