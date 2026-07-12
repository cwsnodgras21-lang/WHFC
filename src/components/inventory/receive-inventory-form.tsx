"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import { receiveInventoryAction } from "@/lib/actions/receive-inventory";
import { onHandKey } from "@/lib/data/inventory";
import type {
  ReceiveItemOption,
  ReceiveLocationOption,
  ReceiveVendorOption,
  RecentReceipt,
} from "@/lib/data/receive";
import { formatDateTime, formatQuantity } from "@/lib/format/inventory";
import {
  RECEIVE_REASON_CODES,
  RECEIVE_REASON_LABELS,
  receiveInventoryFormSchema,
  type ReceiveInventoryFormValues,
  type ReceiveInventoryInput,
} from "@/lib/validation/receive-inventory";
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

type ReceiveInventoryFormProps = {
  items: ReceiveItemOption[];
  locations: ReceiveLocationOption[];
  vendors: ReceiveVendorOption[];
  onHandByKey: Record<string, number>;
  recentReceipts: RecentReceipt[];
  expirationTrackingEnabled?: boolean;
  lotTrackingEnabled?: boolean;
};

function defaultTransactionDateLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function ReceiveInventoryForm({
  items,
  locations,
  vendors,
  onHandByKey,
  recentReceipts: initialReceipts,
  expirationTrackingEnabled = true,
  lotTrackingEnabled = true,
}: ReceiveInventoryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [recentReceipts, setRecentReceipts] = useState(initialReceipts);
  const [localOnHand, setLocalOnHand] = useState(onHandByKey);

  const formDisabled = items.length === 0 || locations.length === 0;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<ReceiveInventoryFormValues>({
    resolver: zodResolver(receiveInventoryFormSchema),
    defaultValues: {
      itemId: "",
      locationId: "",
      quantity: "",
      reasonCode: "vendor_delivery",
      transactionDate: defaultTransactionDateLocal(),
      lotNumber: "",
      expirationDate: "",
      vendorId: "",
    },
  });

  const watchedItemId = watch("itemId");
  const watchedLocationId = watch("locationId");

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

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    setSuccessMessage(null);

    // Progressive requirement: only enforce lot / expiration when the selected
    // item tracks them.
    if (selectedItem?.trackExpiration && expirationTrackingEnabled && !values.expirationDate) {
      setError("expirationDate", {
        message: "Enter an expiration date for this item.",
      });
      return;
    }
    if (selectedItem?.trackLotNumber && lotTrackingEnabled && !values.lotNumber?.trim()) {
      setError("lotNumber", {
        message: "Enter a lot number for this item.",
      });
      return;
    }

    const payload: ReceiveInventoryInput = {
      itemId: values.itemId,
      locationId: values.locationId,
      quantity: Number(values.quantity),
      reasonCode: values.reasonCode,
      transactionDate: new Date(values.transactionDate),
      lotNumber: values.lotNumber?.trim() ? values.lotNumber.trim() : undefined,
      expirationDate: values.expirationDate ? values.expirationDate : undefined,
      vendorId: values.vendorId ? values.vendorId : undefined,
    };

    startTransition(async () => {
      const result = await receiveInventoryAction(payload);

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      const itemLabel = selectedItem?.itemName ?? "Item";
      setSuccessMessage(
        `Received ${formatQuantity(result.quantityReceived)} ${selectedItem?.unitAbbreviation ?? "units"} of ${itemLabel}. On hand at this location is now ${formatQuantity(result.updatedOnHand)}.`
      );

      setLocalOnHand((prev) => ({
        ...prev,
        [onHandKey(values.itemId, values.locationId)]: result.updatedOnHand,
      }));

      setRecentReceipts((prev) => [
        {
          id: result.transactionId,
          itemName: itemLabel,
          locationName:
            locations.find((l) => l.id === values.locationId)?.locationName ??
            "Location",
          quantity: result.quantityReceived,
          reasonLabel: RECEIVE_REASON_LABELS[values.reasonCode],
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
        lotNumber: "",
        expirationDate: "",
        vendorId: values.vendorId ?? "",
      });

      router.refresh();
    });
  });

  return (
    <div className="space-y-6">
      {successMessage ? (
        <Alert variant="success" title="Stock received" message={successMessage} />
      ) : null}
      {serverError ? (
        <Alert variant="error" title="Could not receive stock" message={serverError} />
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          title="Add items first"
          description="You need catalog items before you can receive stock."
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
          description="Choose where received stock will be stored."
          action={
            <LinkButton href="/locations" variant="primary">
              Go to locations
            </LinkButton>
          }
        />
      ) : null}

      {!formDisabled ? (
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormSection
          title="Item and location"
          description="Choose what you received and where it is being stored."
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
                  {location.room ? ` — ${location.room}` : ""}
                </option>
              ))}
            </FormSelect>
          </FormField>

          {currentOnHand !== null ? (
            <div className="readout">
              <span className="readout-label">On hand at this location</span>
              <span className="readout-value">
                {formatQuantity(currentOnHand)}{" "}
                {selectedItem?.unitAbbreviation ?? "units"}
              </span>
            </div>
          ) : null}
        </FormSection>

        <FormSection
          title="Receipt details"
          description="Enter the quantity received and when it arrived."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="quantity"
              label={`Quantity received${selectedItem ? ` (${selectedItem.unitAbbreviation})` : ""}`}
              error={errors.quantity?.message}
            >
              <FormInput
                id="quantity"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                disabled={isPending || formDisabled}
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
                {RECEIVE_REASON_CODES.map((code) => (
                  <option key={code} value={code}>
                    {RECEIVE_REASON_LABELS[code]}
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

        {selectedItem &&
        ((expirationTrackingEnabled && selectedItem.trackExpiration) ||
          (lotTrackingEnabled && selectedItem.trackLotNumber)) ? (
          <FormSection
            title="Expiration and lot (if applicable)"
            description="Required for items that track dates or lot numbers."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {expirationTrackingEnabled && selectedItem.trackExpiration ? (
                <FormField
                  id="expirationDate"
                  label="Expiration date"
                  error={errors.expirationDate?.message}
                >
                  <FormInput
                    id="expirationDate"
                    type="date"
                    disabled={isPending || formDisabled}
                    invalid={Boolean(errors.expirationDate)}
                    {...register("expirationDate")}
                  />
                </FormField>
              ) : null}

              {lotTrackingEnabled && selectedItem.trackLotNumber ? (
                <FormField
                  id="lotNumber"
                  label="Lot number"
                  error={errors.lotNumber?.message}
                >
                  <FormInput
                    id="lotNumber"
                    disabled={isPending || formDisabled}
                    invalid={Boolean(errors.lotNumber)}
                    placeholder="e.g. AB1234"
                    {...register("lotNumber")}
                  />
                </FormField>
              ) : null}
            </div>

            {vendors.length > 0 ? (
              <FormField
                id="vendorId"
                label="Vendor (optional)"
                error={errors.vendorId?.message}
              >
                <FormSelect
                  id="vendorId"
                  disabled={isPending || formDisabled}
                  {...register("vendorId")}
                >
                  <option value="">Not specified</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
            ) : null}
          </FormSection>
        ) : null}

        <div className="flex justify-end pt-1">
          <Button type="submit" variant="primary" disabled={isPending || formDisabled}>
            {isPending ? "Receiving…" : "Receive stock"}
          </Button>
        </div>
      </form>
      ) : null}

      <PageSection
        id="recent-receipts-heading"
        title="Recent receipts"
        action={
          recentReceipts.length > 0 ? (
            <span className="text-xs text-[var(--color-fg-faint)]">
              Last {recentReceipts.length}
            </span>
          ) : undefined
        }
      >
        {recentReceipts.length === 0 ? (
          <EmptyState
            title="No receipts yet"
            description="Completed receive transactions will appear here."
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
                {recentReceipts.map((receipt) => (
                  <tr key={receipt.id}>
                    <td className="muted">
                      {formatDateTime(receipt.transactionDate)}
                    </td>
                    <td>{receipt.itemName}</td>
                    <td className="muted">{receipt.locationName}</td>
                    <td className="muted">{receipt.reasonLabel}</td>
                    <td className="numeric">{formatQuantity(receipt.quantity)}</td>
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
