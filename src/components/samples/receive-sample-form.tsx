"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { receiveSampleAction } from "@/lib/actions/samples";
import type { SampleReceivePageData } from "@/lib/data/samples";
import {
  receiveSampleFormSchema,
  type ReceiveSampleFormValues,
} from "@/lib/validation/samples";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import {
  FormField,
  FormInput,
  FormSection,
  FormSelect,
} from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";

export function ReceiveSampleForm({ data }: { data: SampleReceivePageData }) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReceiveSampleFormValues>({
    resolver: zodResolver(receiveSampleFormSchema),
    defaultValues: {
      sampleProductId: "",
      quantity: "",
      lotNumber: "",
      expirationDate: "",
      vendorId: "",
      representativeName: "",
      receivedDate: "",
      notes: "",
    },
  });

  if (!data.canReceive) {
    return (
      <div className="space-y-6">
        <PageHeader title="Receive samples" />
        <ErrorState
          title="Access denied"
          message={data.permissionMessage ?? "You cannot receive samples."}
        />
      </div>
    );
  }

  function onSubmit(values: ReceiveSampleFormValues) {
    startTransition(async () => {
      setServerError(null);
      setSuccessMessage(null);
      const result = await receiveSampleAction({
        sampleProductId: values.sampleProductId,
        quantity: values.quantity,
        lotNumber: values.lotNumber || null,
        expirationDate: values.expirationDate || null,
        vendorId: values.vendorId || null,
        representativeName: values.representativeName || null,
        receivedDate: values.receivedDate || null,
        notes: values.notes || null,
      });

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      setSuccessMessage("Sample receipt recorded.");
      reset();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receive samples"
        description="Record medication samples received from a manufacturer or representative."
      />

      {serverError ? <Alert variant="error" message={serverError} /> : null}
      {successMessage ? <Alert variant="success" message={successMessage} /> : null}

      {data.products.length === 0 ? (
        <ErrorState
          title="No active sample products"
          message="Ask an administrator to add sample products before recording a receipt."
        />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="Receipt details">
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
                      {p.productName}
                    </option>
                  ))}
                </FormSelect>
              </FormField>

              <FormField
                id="quantity"
                label="Quantity received"
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

              <FormField id="lotNumber" label="Lot number" error={errors.lotNumber?.message}>
                <FormInput id="lotNumber" {...register("lotNumber")} disabled={isPending} />
              </FormField>

              <FormField
                id="expirationDate"
                label="Expiration date"
                error={errors.expirationDate?.message}
              >
                <FormInput
                  id="expirationDate"
                  type="date"
                  {...register("expirationDate")}
                  disabled={isPending}
                />
              </FormField>

              <FormField id="vendorId" label="Vendor">
                <FormSelect id="vendorId" {...register("vendorId")} disabled={isPending}>
                  <option value="">None</option>
                  {data.vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </FormSelect>
              </FormField>

              <FormField id="representativeName" label="Representative name">
                <FormInput
                  id="representativeName"
                  placeholder="Pharma rep who dropped off the samples"
                  {...register("representativeName")}
                  disabled={isPending}
                />
              </FormField>

              <FormField id="receivedDate" label="Date received">
                <FormInput
                  id="receivedDate"
                  type="date"
                  {...register("receivedDate")}
                  disabled={isPending}
                />
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

          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Recording…" : "Record receipt"}
          </Button>
        </form>
      )}
    </div>
  );
}
