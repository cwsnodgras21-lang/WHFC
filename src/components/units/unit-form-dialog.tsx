"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createUnitAction, updateUnitAction } from "@/lib/actions/units";
import type { UnitRow } from "@/lib/data/units-page";
import { unitFormSchema, type UnitFormValues } from "@/lib/validation/unit";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, FormInput } from "@/components/ui/form-field";

type UnitFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  unit: UnitRow | null;
  readOnly?: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

const emptyDefaults: UnitFormValues = { name: "", abbreviation: "", active: true };

export function UnitFormDialog({ open, mode, unit, readOnly = false, onClose, onSuccess }: UnitFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema), defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && unit) { reset({ name: unit.name, abbreviation: unit.abbreviation, active: unit.active }); return; }
    reset(emptyDefaults);
  }, [open, mode, unit, reset]);

  const title = useMemo(() => readOnly ? "Unit details" : mode === "create" ? "New unit" : "Edit unit", [mode, readOnly]);
  if (!open) return null;
  const disabled = readOnly || isPending;

  const onSubmit = handleSubmit((values) => {
    if (readOnly) return;
    setServerError(null);
    startTransition(async () => {
      const payload = { name: values.name.trim(), abbreviation: values.abbreviation.trim(), active: values.active };
      const result = mode === "create" ? await createUnitAction(payload) : await updateUnitAction({ id: unit!.id, ...payload });
      if (!result.success) { setServerError(result.error); return; }
      onSuccess(mode === "create" ? `Created unit "${values.name.trim()}".` : `Updated unit "${values.name.trim()}".`);
      onClose();
    });
  });

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget && !isPending) onClose(); }}>
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="unit-form-title">
        <div className="modal-header">
          <h2 id="unit-form-title" className="modal-title">{title}</h2>
          <Button type="button" variant="icon" aria-label="Close" disabled={isPending} onClick={onClose}>×</Button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body space-y-4">
            {serverError ? <Alert variant="error" message={serverError} /> : null}
            <FormField id="unitName" label="Name" error={errors.name?.message}><FormInput id="unitName" disabled={disabled} {...register("name")} /></FormField>
            <FormField id="unitAbbrev" label="Abbreviation" error={errors.abbreviation?.message}><FormInput id="unitAbbrev" disabled={disabled} {...register("abbreviation")} /></FormField>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={disabled} {...register("active")} /> Active</label>
          </div>
          <div className="modal-footer">
            <Button type="button" variant="secondary" disabled={isPending} onClick={onClose}>{readOnly ? "Close" : "Cancel"}</Button>
            {!readOnly ? <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : mode === "create" ? "Create unit" : "Save changes"}</Button> : null}
          </div>
        </form>
      </div>
    </div>
  );
}
