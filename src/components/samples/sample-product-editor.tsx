"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  saveSampleProductAction,
  deactivateSampleProductAction,
} from "@/lib/actions/samples";
import type { SampleProductEditorData } from "@/lib/data/sample-products";
import {
  sampleProductFormSchema,
  type SampleProductFormValues,
} from "@/lib/validation/samples";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  FormField,
  FormInput,
  FormSection,
  FormSelect,
} from "@/components/ui/form-field";

type SampleProductEditorProps = {
  data: SampleProductEditorData;
  productId?: string;
};

export function SampleProductEditor({
  data,
  productId,
}: SampleProductEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultValues: SampleProductFormValues = {
    productName: data.product?.productName ?? "",
    manufacturerVendor: data.product?.manufacturerVendor ?? "",
    strength: data.product?.strength ?? "",
    dosageForm: data.product?.dosageForm ?? "",
    unitOfMeasureId: data.product?.unitOfMeasureId ?? "",
    reorderThreshold:
      data.product?.reorderThreshold !== undefined
        ? String(data.product.reorderThreshold)
        : "0",
    expirationWarningDays:
      data.product?.expirationWarningDays !== null &&
      data.product?.expirationWarningDays !== undefined
        ? String(data.product.expirationWarningDays)
        : "",
    active: data.product?.active ?? true,
    notes: data.product?.notes ?? "",
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SampleProductFormValues>({
    resolver: zodResolver(sampleProductFormSchema),
    defaultValues,
  });

  function onSubmit(values: SampleProductFormValues) {
    startTransition(async () => {
      setServerError(null);
      const result = await saveSampleProductAction({
        id: productId,
        productName: values.productName,
        manufacturerVendor: values.manufacturerVendor || null,
        strength: values.strength || null,
        dosageForm: values.dosageForm || null,
        unitOfMeasureId: values.unitOfMeasureId,
        reorderThreshold: Number(values.reorderThreshold),
        expirationWarningDays: values.expirationWarningDays
          ? Number(values.expirationWarningDays)
          : null,
        active: values.active,
        notes: values.notes || null,
      });

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      router.push("/samples/products");
      router.refresh();
    });
  }

  function handleDeactivate() {
    if (!productId) return;
    if (
      !window.confirm(
        "Deactivate this sample product? It will no longer appear for receiving or dispensing."
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deactivateSampleProductAction(productId);
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      router.push("/samples/products");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError ? <Alert variant="error" message={serverError} /> : null}

      <FormSection title="Product details">
        <div className="form-grid">
          <FormField
            id="productName"
            label="Product name"
            error={errors.productName?.message}
          >
            <FormInput
              id="productName"
              {...register("productName")}
              disabled={isPending}
            />
          </FormField>

          <FormField id="manufacturerVendor" label="Manufacturer or vendor">
            <FormInput
              id="manufacturerVendor"
              {...register("manufacturerVendor")}
              disabled={isPending}
            />
          </FormField>

          <FormField id="strength" label="Strength">
            <FormInput
              id="strength"
              placeholder="e.g. 20 mg"
              {...register("strength")}
              disabled={isPending}
            />
          </FormField>

          <FormField id="dosageForm" label="Dosage form">
            <FormInput
              id="dosageForm"
              placeholder="e.g. Tablet, injection, cream"
              {...register("dosageForm")}
              disabled={isPending}
            />
          </FormField>

          <FormField
            id="unitOfMeasureId"
            label="Unit of measure"
            error={errors.unitOfMeasureId?.message}
          >
            <FormSelect
              id="unitOfMeasureId"
              {...register("unitOfMeasureId")}
              disabled={isPending}
            >
              <option value="">Select a unit…</option>
              {data.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.abbreviation})
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField
            id="reorderThreshold"
            label="Representative-contact threshold"
            hint="Alert when quantity on hand falls to or below this amount."
            error={errors.reorderThreshold?.message}
          >
            <FormInput
              id="reorderThreshold"
              type="number"
              min="0"
              step="any"
              {...register("reorderThreshold")}
              disabled={isPending}
            />
          </FormField>

          <FormField
            id="expirationWarningDays"
            label="Expiration warning override (days)"
            hint="Leave blank to use the sample default."
          >
            <FormInput
              id="expirationWarningDays"
              type="number"
              min="1"
              step="1"
              {...register("expirationWarningDays")}
              disabled={isPending}
            />
          </FormField>

          <FormField id="active" label="Status">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("active")} disabled={isPending} />
              Active
            </label>
          </FormField>
        </div>

        <FormField id="notes" label="Notes" className="mt-4">
          <textarea
            id="notes"
            rows={2}
            className="form-input"
            placeholder="Short operational note — no patient information."
            {...register("notes")}
            disabled={isPending}
          />
        </FormField>
      </FormSection>

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Saving…" : productId ? "Save product" : "Create product"}
        </Button>
        {productId && data.product?.active ? (
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={handleDeactivate}
          >
            Deactivate
          </Button>
        ) : null}
      </div>
    </form>
  );
}
