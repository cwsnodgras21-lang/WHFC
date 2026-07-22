"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";

import { transferInventoryAction } from "@/lib/actions/transfer-inventory";
import { onHandKey } from "@/lib/data/inventory";
import type {
  RecentTransfer,
  TransferItemOption,
  TransferLocationOption,
} from "@/lib/data/transfer";
import { formatDateTime, formatQuantity } from "@/lib/format/inventory";
import {
  exceedsAvailableOnHand,
  locationsAreSame,
  transferInventoryFormSchema,
  type TransferInventoryFormValues,
  type TransferInventoryInput,
} from "@/lib/validation/transfer-inventory";
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

type TransferInventoryFormProps = {
  items: TransferItemOption[];
  locations: TransferLocationOption[];
  onHandByKey: Record<string, number>;
  recentTransfers: RecentTransfer[];
};

function defaultTransactionDateLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function TransferInventoryForm({
  items,
  locations,
  onHandByKey,
  recentTransfers: initialTransfers,
}: TransferInventoryFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledLocationId = searchParams.get("location") ?? "";
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [recentTransfers, setRecentTransfers] = useState(initialTransfers);
  const [localOnHand, setLocalOnHand] = useState(onHandByKey);

  const formDisabled = items.length === 0 || locations.length < 2;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<TransferInventoryFormValues>({
    resolver: zodResolver(transferInventoryFormSchema),
    defaultValues: {
      itemId: "",
      fromLocationId:
        prefilledLocationId &&
        locations.some((location) => location.id === prefilledLocationId)
          ? prefilledLocationId
          : "",
      toLocationId: "",
      quantity: "",
      transactionDate: defaultTransactionDateLocal(),
    },
  });

  const watchedItemId = watch("itemId");
  const watchedFromLocationId = watch("fromLocationId");
  const watchedToLocationId = watch("toLocationId");

  const selectedItem = useMemo(
    () => items.find((item) => item.id === watchedItemId),
    [items, watchedItemId]
  );

  const fromLocation = useMemo(
    () => locations.find((location) => location.id === watchedFromLocationId),
    [locations, watchedFromLocationId]
  );

  const toLocation = useMemo(
    () => locations.find((location) => location.id === watchedToLocationId),
    [locations, watchedToLocationId]
  );

  const sourceOnHand = useMemo(() => {
    if (!watchedItemId || !watchedFromLocationId) {
      return null;
    }
    return localOnHand[onHandKey(watchedItemId, watchedFromLocationId)] ?? 0;
  }, [localOnHand, watchedItemId, watchedFromLocationId]);

  const destinationOnHand = useMemo(() => {
    if (!watchedItemId || !watchedToLocationId) {
      return null;
    }
    return localOnHand[onHandKey(watchedItemId, watchedToLocationId)] ?? 0;
  }, [localOnHand, watchedItemId, watchedToLocationId]);

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    setSuccessMessage(null);

    if (locationsAreSame(values.fromLocationId, values.toLocationId)) {
      setError("toLocationId", {
        type: "manual",
        message: "Source and destination must be different locations.",
      });
      return;
    }

    const quantity = Number(values.quantity);

    if (sourceOnHand !== null && exceedsAvailableOnHand(quantity, sourceOnHand)) {
      setError("quantity", {
        type: "manual",
        message: `Cannot transfer more than on hand (${formatQuantity(sourceOnHand)} available).`,
      });
      return;
    }

    const payload: TransferInventoryInput = {
      itemId: values.itemId,
      fromLocationId: values.fromLocationId,
      toLocationId: values.toLocationId,
      quantity,
      transactionDate: new Date(values.transactionDate),
    };

    startTransition(async () => {
      const result = await transferInventoryAction(payload);

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      const itemLabel = selectedItem?.itemName ?? "Item";
      const fromLabel = fromLocation?.locationName ?? "source";
      const toLabel = toLocation?.locationName ?? "destination";
      const unit = selectedItem?.unitAbbreviation ?? "units";

      setSuccessMessage(
        `Transferred ${formatQuantity(result.quantityTransferred)} ${unit} of ${itemLabel} from ${fromLabel} to ${toLabel}. On hand is now ${formatQuantity(result.updatedOnHandAtSource)} at source and ${formatQuantity(result.updatedOnHandAtDestination)} at destination.`
      );

      setLocalOnHand((prev) => ({
        ...prev,
        [onHandKey(values.itemId, values.fromLocationId)]:
          result.updatedOnHandAtSource,
        [onHandKey(values.itemId, values.toLocationId)]:
          result.updatedOnHandAtDestination,
      }));

      setRecentTransfers((prev) => [
        {
          id:
            result.transferOutId ??
            result.transactionGroupId ??
            `transfer-${Date.now()}`,
          itemName: itemLabel,
          fromLocationName: fromLabel,
          toLocationName: toLabel,
          quantity: result.quantityTransferred,
          transactionDate: values.transactionDate,
        },
        ...prev.slice(0, 9),
      ]);

      reset({
        itemId: values.itemId,
        fromLocationId: values.fromLocationId,
        toLocationId: "",
        quantity: "",
        transactionDate: defaultTransactionDateLocal(),
      });

      router.refresh();
    });
  });

  const noSourceStock = sourceOnHand !== null && sourceOnHand === 0;

  return (
    <div className="space-y-6">
      {successMessage ? (
        <Alert variant="success" title="Stock transferred" message={successMessage} />
      ) : null}
      {serverError ? (
        <Alert variant="error" title="Could not transfer stock" message={serverError} />
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          title="Add items first"
          description="You need catalog items before you can move stock between locations."
          action={
            <LinkButton href="/items" variant="primary">
              Go to items
            </LinkButton>
          }
        />
      ) : null}

      {items.length > 0 && locations.length < 2 ? (
        <EmptyState
          title="Add another location"
          description="Transfers need at least two storage areas — for example, supply room and exam room."
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
          title="Item and route"
          description="Choose the item and move it between two active locations."
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

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="fromLocationId"
              label="Source location"
              error={errors.fromLocationId?.message}
            >
              <FormSelect
                id="fromLocationId"
                disabled={isPending || formDisabled}
                invalid={Boolean(errors.fromLocationId)}
                {...register("fromLocationId")}
              >
                <option value="">Select source…</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.locationName}
                  </option>
                ))}
              </FormSelect>
            </FormField>

            <FormField
              id="toLocationId"
              label="Destination location"
              error={errors.toLocationId?.message}
            >
              <FormSelect
                id="toLocationId"
                disabled={isPending || formDisabled}
                invalid={Boolean(errors.toLocationId)}
                {...register("toLocationId")}
              >
                <option value="">Select destination…</option>
                {locations.map((location) => (
                  <option
                    key={location.id}
                    value={location.id}
                    disabled={location.id === watchedFromLocationId}
                  >
                    {location.locationName}
                  </option>
                ))}
              </FormSelect>
            </FormField>
          </div>

          {noSourceStock ? (
            <p className="form-hint text-[var(--color-attention)]">
              No stock at the source yet.{" "}
              <Link href="/receive" className="link-subtle">
                Receive stock
              </Link>{" "}
              first.
            </p>
          ) : null}
        </FormSection>

        <FormSection
          title="Transfer details"
          description="Enter how much to move and when."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="quantity"
              label={`Quantity to transfer${selectedItem ? ` (${selectedItem.unitAbbreviation})` : ""}`}
              error={errors.quantity?.message}
            >
              <FormInput
                id="quantity"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                max={sourceOnHand ?? undefined}
                disabled={isPending || formDisabled || noSourceStock}
                invalid={Boolean(errors.quantity)}
                placeholder="0"
                {...register("quantity")}
              />
            </FormField>

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
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              disabled={isPending || formDisabled || noSourceStock}
            >
              {isPending ? "Transferring…" : "Transfer stock"}
            </Button>
          </div>
        </FormSection>
      </form>

      <OnHandSidebar
        cards={[
          {
            label: "On hand at source",
            quantity: sourceOnHand,
            unit: selectedItem?.unitAbbreviation ?? "units",
            caption:
              selectedItem && fromLocation
                ? `${selectedItem.itemName} · ${fromLocation.locationName}`
                : undefined,
          },
          ...(watchedToLocationId
            ? [
                {
                  label: "On hand at destination",
                  quantity: destinationOnHand,
                  unit: selectedItem?.unitAbbreviation ?? "units",
                  caption:
                    selectedItem && toLocation
                      ? `${selectedItem.itemName} · ${toLocation.locationName}`
                      : undefined,
                },
              ]
            : []),
        ]}
      />
      </div>
      ) : null}

      <PageSection
        id="recent-transfers-heading"
        title="Recent transfers"
        action={
          recentTransfers.length > 0 ? (
            <span className="text-xs text-[var(--color-fg-faint)]">
              Last {recentTransfers.length}
            </span>
          ) : undefined
        }
      >
        {recentTransfers.length === 0 ? (
          <EmptyState
            title="No transfers yet"
            description="Completed transfers will appear here after you move stock between locations."
          />
        ) : (
          <DataTableShell>
            <DataTable>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Item</th>
                  <th scope="col">From</th>
                  <th scope="col">To</th>
                  <th scope="col" className="text-right">
                    Qty
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentTransfers.map((transfer) => (
                  <tr key={transfer.id}>
                    <td className="muted">
                      {formatDateTime(transfer.transactionDate)}
                    </td>
                    <td>{transfer.itemName}</td>
                    <td className="muted">{transfer.fromLocationName}</td>
                    <td className="muted">{transfer.toLocationName}</td>
                    <td className="numeric">
                      {formatQuantity(transfer.quantity)}
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
