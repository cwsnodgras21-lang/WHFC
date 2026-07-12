"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createVendorAction, updateVendorAction } from "@/lib/actions/vendors";
import type { VendorRow } from "@/lib/data/vendors-page";
import { vendorFormSchema, type VendorFormValues } from "@/lib/validation/vendor";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, FormInput } from "@/components/ui/form-field";

type VendorFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  vendor: VendorRow | null;
  readOnly?: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

const emptyDefaults: VendorFormValues = {
  name: "",
  contactEmail: "",
  contactPhone: "",
  active: true,
};

export function VendorFormDialog({
  open,
  mode,
  vendor,
  readOnly = false,
  onClose,
  onSuccess,
}: VendorFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && vendor) {
      reset({
        name: vendor.name,
        contactEmail: vendor.contactEmail ?? "",
        contactPhone: vendor.contactPhone ?? "",
        active: vendor.active,
      });
      return;
    }
    reset(emptyDefaults);
  }, [open, mode, vendor, reset]);

  const title = useMemo(() => {
    if (readOnly) return "Vendor details";
    return mode === "create" ? "New vendor" : "Edit vendor";
  }, [mode, readOnly]);

  if (!open) return null;
  const disabled = readOnly || isPending;

  const onSubmit = handleSubmit((values) => {
    if (readOnly) return;
    setServerError(null);
    startTransition(async () => {
      const payload = {
        name: values.name.trim(),
        contactEmail: values.contactEmail?.trim() ? values.contactEmail.trim() : null,
        contactPhone: values.contactPhone?.trim() ? values.contactPhone.trim() : null,
        active: values.active,
      };
      const result = mode === "create"
        ? await createVendorAction(payload)
        : await updateVendorAction({ id: vendor!.id, ...payload });
      if (!result.success) { setServerError(result.error); return; }
      onSuccess(mode === "create" ? `Created vendor "${values.name.trim()}".` : `Updated vendor "${values.name.trim()}".`);
      onClose();
    });
  });

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget && !isPending) onClose(); }}>
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="vendor-form-title">
        <div className="modal-header">
          <h2 id="vendor-form-title" className="modal-title">{title}</h2>
          <Button type="button" variant="icon" aria-label="Close" disabled={isPending} onClick={onClose}>×</Button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body space-y-4">
            {serverError ? <Alert variant="error" message={serverError} /> : null}
            <FormField id="vendorName" label="Vendor name" error={errors.name?.message}>
              <FormInput id="vendorName" disabled={disabled} {...register("name")} />
            </FormField>
            <FormField id="vendorEmail" label="Contact email (optional)" error={errors.contactEmail?.message}>
              <FormInput id="vendorEmail" type="email" disabled={disabled} {...register("contactEmail")} />
            </FormField>
            <FormField id="vendorPhone" label="Contact phone (optional)" error={errors.contactPhone?.message}>
              <FormInput id="vendorPhone" disabled={disabled} {...register("contactPhone")} />
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" disabled={disabled} {...register("active")} /> Active
            </label>
          </div>
          <div className="modal-footer">
            <Button type="button" variant="secondary" disabled={isPending} onClick={onClose}>{readOnly ? "Close" : "Cancel"}</Button>
            {!readOnly ? <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : mode === "create" ? "Create vendor" : "Save changes"}</Button> : null}
          </div>
        </form>
      </div>
    </div>
  );
}
