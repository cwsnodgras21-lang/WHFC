"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { saveItemVendorAction } from "@/lib/actions/item-vendors";
import type {
  ItemVendorSource,
  VendorOption,
} from "@/lib/data/item-sourcing";
import {
  itemVendorFormSchema,
  type ItemVendorFormValues,
} from "@/lib/validation/item-vendor";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, FormInput, FormSelect } from "@/components/ui/form-field";

type ItemVendorFormDialogProps = {
  open: boolean;
  itemId: string;
  source: ItemVendorSource | null;
  vendorOptions: VendorOption[];
  onClose: () => void;
  onSuccess: (message: string) => void;
};

const emptyDefaults: ItemVendorFormValues = {
  vendorId: "",
  isPreferred: false,
  vendorSku: "",
  manufacturer: "",
  manufacturerPartNumber: "",
  packSize: "",
  typicalOrderQuantity: "",
  leadTimeDays: "",
  typicalCost: "",
  lastOrderDate: "",
  orderingNotes: "",
  orderingUrl: "",
};

export function ItemVendorFormDialog({
  open,
  itemId,
  source,
  vendorOptions,
  onClose,
  onSuccess,
}: ItemVendorFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ItemVendorFormValues>({
    resolver: zodResolver(itemVendorFormSchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (!open) return;
    if (source) {
      reset({
        vendorId: source.vendorId,
        isPreferred: source.isPreferred,
        vendorSku: source.vendorSku ?? "",
        manufacturer: source.manufacturer ?? "",
        manufacturerPartNumber: source.manufacturerPartNumber ?? "",
        packSize: source.packSize ?? "",
        typicalOrderQuantity: source.typicalOrderQuantity ?? "",
        leadTimeDays: source.leadTimeDays ?? "",
        typicalCost: source.typicalCost ?? "",
        lastOrderDate: source.lastOrderDate ?? "",
        orderingNotes: source.orderingNotes ?? "",
        orderingUrl: source.orderingUrl ?? "",
      });
      return;
    }
    reset(emptyDefaults);
  }, [open, source, reset]);

  if (!open) return null;

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await saveItemVendorAction({
        ...values,
        itemId,
        id: source?.id,
      });
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      onSuccess(source ? "Vendor source updated." : "Vendor source added.");
      onClose();
    });
  });

  // When editing, the vendor is fixed (identity of the source); when adding,
  // only vendors not already attached are selectable.
  const vendorSelectDisabled = isPending || source !== null;

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
        aria-labelledby="item-vendor-form-title"
      >
        <div className="modal-header">
          <h2 id="item-vendor-form-title" className="modal-title">
            {source ? "Edit vendor source" : "Add vendor source"}
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
        <form onSubmit={onSubmit}>
          <div className="modal-body space-y-4">
            {serverError ? <Alert variant="error" message={serverError} /> : null}

            <FormField id="vendorId" label="Vendor" error={errors.vendorId?.message}>
              <FormSelect
                id="vendorId"
                disabled={vendorSelectDisabled}
                {...register("vendorId")}
              >
                <option value="">Select a vendor…</option>
                {vendorOptions.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
                {source &&
                !vendorOptions.some((v) => v.id === source.vendorId) ? (
                  <option value={source.vendorId}>{source.vendorName}</option>
                ) : null}
              </FormSelect>
            </FormField>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={isPending}
                {...register("isPreferred")}
              />{" "}
              Preferred vendor for this item
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="vendorSku"
                label="Vendor SKU"
                error={errors.vendorSku?.message}
              >
                <FormInput id="vendorSku" disabled={isPending} {...register("vendorSku")} />
              </FormField>
              <FormField
                id="packSize"
                label="Pack size"
                error={errors.packSize?.message}
              >
                <FormInput
                  id="packSize"
                  placeholder="e.g. box of 100"
                  disabled={isPending}
                  {...register("packSize")}
                />
              </FormField>
              <FormField
                id="manufacturer"
                label="Manufacturer"
                error={errors.manufacturer?.message}
              >
                <FormInput
                  id="manufacturer"
                  disabled={isPending}
                  {...register("manufacturer")}
                />
              </FormField>
              <FormField
                id="manufacturerPartNumber"
                label="Manufacturer part #"
                error={errors.manufacturerPartNumber?.message}
              >
                <FormInput
                  id="manufacturerPartNumber"
                  disabled={isPending}
                  {...register("manufacturerPartNumber")}
                />
              </FormField>
              <FormField
                id="typicalOrderQuantity"
                label="Typical order qty"
                error={errors.typicalOrderQuantity?.message}
              >
                <FormInput
                  id="typicalOrderQuantity"
                  type="number"
                  step="any"
                  min="0"
                  disabled={isPending}
                  {...register("typicalOrderQuantity")}
                />
              </FormField>
              <FormField
                id="leadTimeDays"
                label="Lead time (days)"
                error={errors.leadTimeDays?.message}
              >
                <FormInput
                  id="leadTimeDays"
                  type="number"
                  min="0"
                  disabled={isPending}
                  {...register("leadTimeDays")}
                />
              </FormField>
              <FormField
                id="typicalCost"
                label="Typical cost"
                error={errors.typicalCost?.message}
              >
                <FormInput
                  id="typicalCost"
                  type="number"
                  step="any"
                  min="0"
                  disabled={isPending}
                  {...register("typicalCost")}
                />
              </FormField>
              <FormField
                id="lastOrderDate"
                label="Last order date"
                error={errors.lastOrderDate?.message}
              >
                <FormInput
                  id="lastOrderDate"
                  type="date"
                  disabled={isPending}
                  {...register("lastOrderDate")}
                />
              </FormField>
            </div>

            <FormField
              id="orderingUrl"
              label="Ordering URL"
              error={errors.orderingUrl?.message}
            >
              <FormInput
                id="orderingUrl"
                type="url"
                placeholder="https://…"
                disabled={isPending}
                {...register("orderingUrl")}
              />
            </FormField>

            <FormField
              id="orderingNotes"
              label="Ordering notes"
              error={errors.orderingNotes?.message}
            >
              <textarea
                id="orderingNotes"
                className="form-input"
                rows={2}
                disabled={isPending}
                {...register("orderingNotes")}
              />
            </FormField>
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : source ? "Save changes" : "Add source"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
