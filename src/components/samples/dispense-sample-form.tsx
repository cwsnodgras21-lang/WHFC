"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { dispenseSampleAction } from "@/lib/actions/samples";
import type { SampleDispensePageData } from "@/lib/data/samples";
import {
  dispenseSampleFormSchema,
  type DispenseSampleFormValues,
} from "@/lib/validation/samples";
import { formatQuantity } from "@/lib/format/inventory";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { HelpButton } from "@/components/help/help-button";
import { ErrorState } from "@/components/ui/error-state";
import {
  FormField,
  FormInput,
  FormSection,
  FormSelect,
} from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";

export function DispenseSampleForm({ data }: { data: SampleDispensePageData }) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<DispenseSampleFormValues>({
    resolver: zodResolver(dispenseSampleFormSchema),
    defaultValues: {
      sampleProductId: "",
      quantity: "",
      patientReference: "",
      sampleLotId: "",
      notes: "",
    },
  });

  const sampleProductId = watch("sampleProductId");
  const quantity = watch("quantity");
  const sampleLotId = watch("sampleLotId");

  const selectedProduct = useMemo(
    () => data.products.find((p) => p.id === sampleProductId) ?? null,
    [data.products, sampleProductId]
  );

  const lotsForProduct = useMemo(
    () => data.lots.filter((l) => l.sampleProductId === sampleProductId),
    [data.lots, sampleProductId]
  );

  const availableOnHand = useMemo(() => {
    if (sampleLotId) {
      return lotsForProduct.find((l) => l.lotId === sampleLotId)?.quantityOnHand ?? 0;
    }
    return selectedProduct?.quantityOnHand ?? 0;
  }, [sampleLotId, lotsForProduct, selectedProduct]);

  const requestedQty = Number(quantity);
  const insufficientStock =
    !Number.isNaN(requestedQty) && requestedQty > 0 && requestedQty > availableOnHand;

  if (!data.canDispense) {
    return (
      <div className="space-y-6">
        <PageHeader title="Give sample" />
        <ErrorState
          title="Access denied"
          message={data.permissionMessage ?? "You cannot give samples."}
        />
      </div>
    );
  }

  function onSubmit(values: DispenseSampleFormValues) {
    if (insufficientStock) return;
    startTransition(async () => {
      setServerError(null);
      setSuccessMessage(null);
      const result = await dispenseSampleAction({
        sampleProductId: values.sampleProductId,
        quantity: values.quantity,
        patientReference: values.patientReference,
        sampleLotId: values.sampleLotId || null,
        notes: values.notes || null,
      });

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      setSuccessMessage("Sample given and inventory updated.");
      reset();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Give sample"
        description="Record a medication sample provided to a patient."
        actions={<HelpButton topic="samples-dispense" />}
      />

      <Alert
        variant="warning"
        message="Enter only a patient MRN or initials — never a full name or other identifying information."
      />

      {serverError ? <Alert variant="error" message={serverError} /> : null}
      {successMessage ? <Alert variant="success" message={successMessage} /> : null}

      {data.products.length === 0 ? (
        <ErrorState
          title="No samples in stock"
          message="There is no sample inventory available to dispense right now."
        />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="Dispense details">
            <div className="form-grid">
              <FormField
                id="sampleProductId"
                label="Sample product"
                error={errors.sampleProductId?.message}
              >
                <FormSelect
                  id="sampleProductId"
                  {...register("sampleProductId")}
                  disabled={isPending}
                >
                  <option value="">Select a product…</option>
                  {data.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productName} — {formatQuantity(p.quantityOnHand)} {p.unitAbbreviation} on hand
                    </option>
                  ))}
                </FormSelect>
              </FormField>

              <FormField
                id="quantity"
                label="Quantity"
                error={errors.quantity?.message}
              >
                <FormInput
                  id="quantity"
                  type="number"
                  min="0"
                  step="any"
                  {...register("quantity")}
                  disabled={isPending}
                />
              </FormField>

              <FormField
                id="patientReference"
                label="Patient reference (MRN or initials)"
                error={errors.patientReference?.message}
              >
                <FormInput
                  id="patientReference"
                  maxLength={64}
                  {...register("patientReference")}
                  disabled={isPending}
                />
              </FormField>

              {lotsForProduct.length > 0 ? (
                <FormField
                  id="sampleLotId"
                  label="Lot"
                  hint="Leave as automatic to use the soonest-expiring lot first."
                >
                  <FormSelect
                    id="sampleLotId"
                    {...register("sampleLotId")}
                    disabled={isPending}
                  >
                    <option value="">Automatic (earliest expiration first)</option>
                    {lotsForProduct.map((l) => (
                      <option key={l.lotId} value={l.lotId}>
                        {l.lotNumber ?? "No lot #"} — exp {l.expirationDate ?? "n/a"} —{" "}
                        {formatQuantity(l.quantityOnHand)} available
                      </option>
                    ))}
                  </FormSelect>
                </FormField>
              ) : null}
            </div>

            <FormField id="notes" label="Notes" className="mt-4">
              <textarea
                id="notes"
                rows={2}
                className="form-input"
                placeholder="Short operational note — no clinical detail."
                {...register("notes")}
                disabled={isPending}
              />
            </FormField>
          </FormSection>

          {selectedProduct ? (
            <p className="text-sm text-muted">
              Available: {formatQuantity(availableOnHand)} {selectedProduct.unitAbbreviation}
              {quantity ? ` — requested: ${quantity} ${selectedProduct.unitAbbreviation}` : null}
            </p>
          ) : null}

          {insufficientStock ? (
            <Alert
              variant="error"
              message={`Not enough stock — ${formatQuantity(availableOnHand)} available, ${quantity} requested.`}
            />
          ) : null}

          <Button type="submit" variant="primary" disabled={isPending || insufficientStock}>
            {isPending ? "Recording…" : "Give sample"}
          </Button>
        </form>
      )}
    </div>
  );
}
