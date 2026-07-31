"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { updateExpirationSettingsAction } from "@/lib/actions/expiration-settings";
import type { ExpirationSettingsPageData } from "@/lib/data/expiration-settings-page";
import {
  expirationSettingsFormSchema,
  type ExpirationSettingsFormValues,
} from "@/lib/validation/expiration-settings";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { FormField, FormInput, FormSection } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";

export function ExpirationSettingsForm({
  data,
}: {
  data: ExpirationSettingsPageData;
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExpirationSettingsFormValues>({
    resolver: zodResolver(expirationSettingsFormSchema),
    defaultValues: {
      defaultExpirationWarningDays: String(data.defaultExpirationWarningDays),
      defaultSampleExpirationWarningDays: String(
        data.defaultSampleExpirationWarningDays
      ),
    },
  });

  if (!data.canManage) {
    return (
      <div className="space-y-6">
        <PageHeader title="Expiration settings" />
        <ErrorState
          title="Access denied"
          message={
            data.permissionMessage ?? "You cannot manage expiration settings."
          }
        />
      </div>
    );
  }

  function onSubmit(values: ExpirationSettingsFormValues) {
    startTransition(async () => {
      setServerError(null);
      setSuccessMessage(null);
      const result = await updateExpirationSettingsAction({
        defaultExpirationWarningDays: values.defaultExpirationWarningDays,
        defaultSampleExpirationWarningDays:
          values.defaultSampleExpirationWarningDays,
      });

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      setSuccessMessage("Expiration settings updated.");
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expiration settings"
        description="Set clinic-wide defaults for when inventory and samples are flagged as expiring soon. Items and sample products can override these individually; categories can override for items."
      />

      {serverError ? <Alert variant="error" message={serverError} /> : null}
      {successMessage ? <Alert variant="success" message={successMessage} /> : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title="Defaults">
          <div className="form-grid">
            <FormField
              id="defaultExpirationWarningDays"
              label="Inventory items — warn within (days)"
              hint="Used unless a category or item overrides it."
              error={errors.defaultExpirationWarningDays?.message}
            >
              <FormInput
                id="defaultExpirationWarningDays"
                type="number"
                min={1}
                step={1}
                disabled={isPending}
                {...register("defaultExpirationWarningDays")}
              />
            </FormField>

            <FormField
              id="defaultSampleExpirationWarningDays"
              label="Samples — warn within (days)"
              hint="Used unless a sample product overrides it."
              error={errors.defaultSampleExpirationWarningDays?.message}
            >
              <FormInput
                id="defaultSampleExpirationWarningDays"
                type="number"
                min={1}
                step={1}
                disabled={isPending}
                {...register("defaultSampleExpirationWarningDays")}
              />
            </FormField>
          </div>
        </FormSection>

        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Saving…" : "Save settings"}
        </Button>
      </form>
    </div>
  );
}
