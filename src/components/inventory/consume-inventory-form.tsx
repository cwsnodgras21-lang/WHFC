"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";

import { consumeInventoryAction } from "@/lib/actions/consume-inventory";
import { onHandKey } from "@/lib/data/inventory";
import type {
  ConsumeItemOption,
  ConsumeLocationOption,
  ConsumeLotOption,
  RecentConsumption,
} from "@/lib/data/consume";
import {
  formatDate,
  formatDateTime,
  formatDaysUntilExpiration,
  formatQuantity,
} from "@/lib/format/inventory";
import { sortLotsFefo } from "@/lib/lots/expiration";
import {
  CONSUME_REASON_CODES,
  CONSUME_REASON_LABELS,
  consumeInventoryFormSchema,
  exceedsAvailableOnHand,
  type ConsumeInventoryFormValues,
  type ConsumeInventoryInput,
} from "@/lib/validation/consume-inventory";
import { Alert } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  FormField,
  FormInput,
  FormSection,
  FormSelect,
} from "@/components/ui/form-field";
import { PageSection } from "@/components/ui/page-section";
import { OnHandSidebar } from "@/components/inventory/on-hand-sidebar";

type ConsumeInventoryFormProps = {
  items: ConsumeItemOption[];
  locations: ConsumeLocationOption[];
  lots: ConsumeLotOption[];
  onHandByKey: Record<string, number>;
  recentConsumptions: RecentConsumption[];
  lotTrackingEnabled?: boolean;
};

function defaultTransactionDateLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function ConsumeInventoryForm({
  items,
  locations,
  lots,
  onHandByKey,
  recentConsumptions: initialConsumptions,
  lotTrackingEnabled = true,
}: ConsumeInventoryFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledLocationId = searchParams.get("location") ?? "";
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [recentConsumptions, setRecentConsumptions] =
    useState(initialConsumptions);
  const [localOnHand, setLocalOnHand] = useState(onHandByKey);
  const [chooseLotManually, setChooseLotManually] = useState(false);

  const formDisabled = items.length === 0 || locations.length === 0;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ConsumeInventoryFormValues>({
    resolver: zodResolver(consumeInventoryFormSchema),
    defaultValues: {
      itemId: "",
      locationId:
        prefilledLocationId &&
        locations.some((location) => location.id === prefilledLocationId)
          ? prefilledLocationId
          : "",
      quantity: "",
      reasonCode: "clinic_use",
      transactionDate: defaultTransactionDateLocal(),
      lotId: "",
      allowExpired: false,
    },
  });

  const watchedItemId = watch("itemId");
  const watchedLocationId = watch("locationId");
  const watchedLotId = watch("lotId");
  const watchedReason = watch("reasonCode");

  const selectedItem = useMemo(
    () => items.find((item) => item.id === watchedItemId),
    [items, watchedItemId]
  );

  const currentOnHand = useMemo(() => {
    if (!watchedItemId || !watchedLocationId) {
      return null;
    }
    return localOnHand[onHandKey(watchedItemId, watchedLocationId)] ?? 0;
  }, [localOnHand, watchedItemId, watchedLocationId]);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === watchedLocationId),
    [locations, watchedLocationId]
  );

  // Active lots for the selected item + location, earliest-expiring first.
  const lotsForSelection = useMemo(() => {
    if (!watchedItemId || !watchedLocationId) {
      return [];
    }
    return sortLotsFefo(
      lots
        .filter(
          (lot) =>
            lot.itemId === watchedItemId &&
            lot.locationId === watchedLocationId &&
            lot.quantityOnHand > 0
        )
        .map((lot) => ({
          ...lot,
          id: lot.lotId,
          receivedDate: lot.expirationDate ?? "",
        }))
    );
  }, [lots, watchedItemId, watchedLocationId]);

  const hasLots = lotsForSelection.length > 0;

  // Which lot will actually be used first (manual pick, or FEFO earliest).
  const activeLot = useMemo(() => {
    if (!hasLots) return null;
    if (chooseLotManually && watchedLotId) {
      return (
        lotsForSelection.find((lot) => lot.lotId === watchedLotId) ?? null
      );
    }
    return lotsForSelection[0];
  }, [hasLots, chooseLotManually, watchedLotId, lotsForSelection]);

  const showExpiredConfirm =
    watchedReason === "clinic_use" && activeLot?.status === "expired";

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    setSuccessMessage(null);

    const quantity = Number(values.quantity);

    if (currentOnHand !== null && exceedsAvailableOnHand(quantity, currentOnHand)) {
      setError("quantity", {
        type: "manual",
        message: `Cannot consume more than on hand (${formatQuantity(currentOnHand)} available).`,
      });
      return;
    }

    const useManualLot =
      chooseLotManually &&
      Boolean(values.lotId) &&
      lotsForSelection.some((lot) => lot.lotId === values.lotId);

    if (showExpiredConfirm && !values.allowExpired) {
      setError("allowExpired", {
        type: "manual",
        message: "Confirm using expired stock, or choose a different lot.",
      });
      return;
    }

    const payload: ConsumeInventoryInput = {
      itemId: values.itemId,
      locationId: values.locationId,
      quantity,
      reasonCode: values.reasonCode,
      transactionDate: new Date(values.transactionDate),
      lotId: useManualLot ? values.lotId : undefined,
      allowExpired: values.allowExpired ?? undefined,
    };

    startTransition(async () => {
      const result = await consumeInventoryAction(payload);

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      const itemLabel = selectedItem?.itemName ?? "Item";
      setSuccessMessage(
        `Consumed ${formatQuantity(result.quantityConsumed)} ${selectedItem?.unitAbbreviation ?? "units"} of ${itemLabel}. On hand at this location is now ${formatQuantity(result.updatedOnHand)}.`
      );

      setLocalOnHand((prev) => ({
        ...prev,
        [onHandKey(values.itemId, values.locationId)]: result.updatedOnHand,
      }));

      setRecentConsumptions((prev) => [
        {
          id: result.transactionId,
          itemName: itemLabel,
          locationName:
            locations.find((l) => l.id === values.locationId)?.locationName ??
            "Location",
          quantity: result.quantityConsumed,
          reasonLabel: CONSUME_REASON_LABELS[values.reasonCode],
          transactionDate: values.transactionDate,
        },
        ...prev.slice(0, 9),
      ]);

      reset({
        itemId: values.itemId,
        locationId: values.locationId,
        quantity: "",
        reasonCode: values.reasonCode,
        transactionDate: defaultTransactionDateLocal(),
        lotId: "",
        allowExpired: false,
      });
      setChooseLotManually(false);

      router.refresh();
    });
  });

  const noStockHere = currentOnHand !== null && currentOnHand === 0;

  return (
    <div className="space-y-6">
      {successMessage ? (
        <Alert variant="success" title="Stock consumed" message={successMessage} />
      ) : null}
      {serverError ? (
        <Alert variant="error" title="Could not consume stock" message={serverError} />
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          title="Add items first"
          description="You need catalog items before you can record usage."
          action={
            <LinkButton href="/items" variant="primary">
              Go to items
            </LinkButton>
          }
        />
      ) : null}

      {items.length > 0 && locations.length === 0 ? (
        <EmptyState
          title="Add a storage location"
          description="Choose where stock is stored before recording usage."
          action={
            <LinkButton href="/locations" variant="primary">
              Go to locations
            </LinkButton>
          }
        />
      ) : null}

      {!formDisabled ? (
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_300px]">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormSection
          title="Item and location"
          description="Choose what was used and where it came from."
        >
          <FormField id="itemId" label="Item" error={errors.itemId?.message}>
            <FormSelect
              id="itemId"
              disabled={isPending || formDisabled}
              invalid={Boolean(errors.itemId)}
              {...register("itemId")}
            >
              <option value="">Select item…</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.itemName} ({item.internalSku})
                </option>
              ))}
            </FormSelect>
          </FormField>

          {selectedItem ? (
            <p className="form-hint -mt-1">
              Stocking unit:{" "}
              <span className="font-semibold text-[var(--color-fg)]">
                {selectedItem.unitName} ({selectedItem.unitAbbreviation})
              </span>
            </p>
          ) : null}

          <FormField
            id="locationId"
            label="Location"
            error={errors.locationId?.message}
          >
            <FormSelect
              id="locationId"
              disabled={isPending || formDisabled}
              invalid={Boolean(errors.locationId)}
              {...register("locationId")}
            >
              <option value="">Select location…</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.locationName}
                </option>
              ))}
            </FormSelect>
          </FormField>

          {noStockHere ? (
            <p className="form-hint text-[var(--color-attention)]">
              No stock here yet.{" "}
              <Link href="/receive" className="link-subtle">
                Receive stock
              </Link>{" "}
              first.
            </p>
          ) : null}
        </FormSection>

        <FormSection
          title="Usage details"
          description="Enter the quantity used and when it happened."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="quantity"
              label={`Quantity consumed${selectedItem ? ` (${selectedItem.unitAbbreviation})` : ""}`}
              error={errors.quantity?.message}
            >
              <FormInput
                id="quantity"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                max={currentOnHand ?? undefined}
                disabled={isPending || formDisabled || noStockHere}
                invalid={Boolean(errors.quantity)}
                placeholder="0"
                {...register("quantity")}
              />
            </FormField>

            <FormField
              id="reasonCode"
              label="Reason"
              error={errors.reasonCode?.message}
            >
              <FormSelect
                id="reasonCode"
                disabled={isPending || formDisabled}
                invalid={Boolean(errors.reasonCode)}
                {...register("reasonCode")}
              >
                {CONSUME_REASON_CODES.map((code) => (
                  <option key={code} value={code}>
                    {CONSUME_REASON_LABELS[code]}
                  </option>
                ))}
              </FormSelect>
            </FormField>
          </div>

          <FormField
            id="transactionDate"
            label="Transaction date and time"
            error={errors.transactionDate?.message}
          >
            <FormInput
              id="transactionDate"
              type="datetime-local"
              disabled={isPending || formDisabled}
              invalid={Boolean(errors.transactionDate)}
              {...register("transactionDate")}
            />
          </FormField>
        </FormSection>

        {lotTrackingEnabled && hasLots ? (
          <FormSection
            title="Which stock to use"
            description="Use oldest first — the earliest-expiring lot is used automatically."
          >
            {!chooseLotManually ? (
              <div className="readout">
                <span className="readout-label">Uses first</span>
                <span className="readout-value">
                  {lotsForSelection[0].expirationDate
                    ? `Exp ${formatDate(lotsForSelection[0].expirationDate)}`
                    : "Earliest received"}
                  {lotsForSelection[0].lotNumber
                    ? ` · Lot ${lotsForSelection[0].lotNumber}`
                    : ""}
                </span>
              </div>
            ) : (
              <FormField id="lotId" label="Choose lot" error={errors.lotId?.message}>
                <FormSelect
                  id="lotId"
                  disabled={isPending || formDisabled}
                  {...register("lotId")}
                >
                  <option value="">Use oldest first (recommended)</option>
                  {lotsForSelection.map((lot) => (
                    <option key={lot.lotId} value={lot.lotId}>
                      {lot.expirationDate
                        ? `Exp ${formatDate(lot.expirationDate)}`
                        : "No expiration"}
                      {" · "}
                      {formatQuantity(lot.quantityOnHand)}{" "}
                      {selectedItem?.unitAbbreviation ?? "units"}
                      {lot.lotNumber ? ` · Lot ${lot.lotNumber}` : ""}
                      {lot.status === "expired" ? " · EXPIRED" : ""}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
            )}

            <button
              type="button"
              className="text-sm font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
              onClick={() => {
                setChooseLotManually((prev) => {
                  const next = !prev;
                  if (!next) {
                    setValue("lotId", "");
                  }
                  return next;
                });
              }}
            >
              {chooseLotManually ? "Use oldest first" : "Choose lot manually"}
            </button>

            {showExpiredConfirm ? (
              <div className="rounded-md border border-[var(--color-attention)] p-3">
                <label className="flex items-start gap-2 text-sm text-[var(--color-fg)]">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)]"
                    disabled={isPending}
                    {...register("allowExpired")}
                  />
                  <span>
                    This stock has expired ({formatDaysUntilExpiration(
                      activeLot?.daysUntilExpiration ?? null
                    )}
                    ). Confirm using it anyway.
                  </span>
                </label>
                {errors.allowExpired?.message ? (
                  <p
                    role="alert"
                    className="mt-1 text-xs font-medium text-[var(--color-danger)]"
                  >
                    {errors.allowExpired.message}
                  </p>
                ) : null}
              </div>
            ) : null}
          </FormSection>
        ) : null}

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            variant="primary"
            disabled={isPending || formDisabled || noStockHere}
          >
            {isPending ? "Recording…" : "Use stock"}
          </Button>
        </div>
      </form>

      <OnHandSidebar
        cards={[
          {
            label: "On hand at this location",
            quantity: currentOnHand,
            unit: selectedItem?.unitAbbreviation ?? "units",
            caption:
              selectedItem && selectedLocation
                ? `${selectedItem.itemName} · ${selectedLocation.locationName}`
                : undefined,
          },
        ]}
      />
      </div>
      ) : null}

      <PageSection
        id="recent-consumptions-heading"
        title="Recent consumption"
        action={
          recentConsumptions.length > 0 ? (
            <span className="text-xs text-[var(--color-fg-faint)]">
              Last {recentConsumptions.length}
            </span>
          ) : undefined
        }
      >
        {recentConsumptions.length === 0 ? (
          <EmptyState
            title="No consumption yet"
            description="Completed consume transactions will appear here."
          />
        ) : (
          <DataTableShell>
            <DataTable>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Item</th>
                  <th scope="col">Location</th>
                  <th scope="col">Reason</th>
                  <th scope="col" className="text-right">
                    Qty
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentConsumptions.map((consumption) => (
                  <tr key={consumption.id}>
                    <td className="muted">
                      {formatDateTime(consumption.transactionDate)}
                    </td>
                    <td>{consumption.itemName}</td>
                    <td className="muted">{consumption.locationName}</td>
                    <td className="muted">{consumption.reasonLabel}</td>
                    <td className="numeric">
                      {formatQuantity(consumption.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </DataTableShell>
        )}
      </PageSection>
    </div>
  );
}
