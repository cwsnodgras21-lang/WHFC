"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createImagingOrderAction,
  updateImagingOrderAction,
} from "@/lib/actions/imaging";
import type { ImagingOrderRow } from "@/lib/data/imaging-page";
import {
  imagingOrderFormSchema,
  type ImagingOrderFormValues,
} from "@/lib/validation/imaging";
import {
  IMAGING_AUTHORIZATION_LABELS,
  IMAGING_AUTHORIZATION_STATUSES,
  IMAGING_STATUSES,
  IMAGING_STATUS_LABELS,
} from "@/lib/imaging/constants";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, FormInput, FormSelect } from "@/components/ui/form-field";

type ImagingOrderFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  order: ImagingOrderRow | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

const emptyDefaults: ImagingOrderFormValues = {
  patientReference: "",
  orderingProvider: "",
  imagingType: "",
  imagingLocation: "",
  dateOrdered: "",
  appointmentDate: "",
  appointmentTime: "",
  status: "ordered",
  authorizationStatus: "not_required",
  authorizationNumber: "",
  notes: "",
};

export function ImagingOrderFormDialog({
  open,
  mode,
  order,
  onClose,
  onSuccess,
}: ImagingOrderFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ImagingOrderFormValues>({
    resolver: zodResolver(imagingOrderFormSchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && order) {
      reset({
        patientReference: order.patientReference,
        orderingProvider: order.orderingProvider,
        imagingType: order.imagingType,
        imagingLocation: order.imagingLocation ?? "",
        dateOrdered: order.dateOrdered ?? "",
        appointmentDate: order.appointmentDate ?? "",
        appointmentTime: order.appointmentTime?.slice(0, 5) ?? "",
        status: order.status,
        authorizationStatus: order.authorizationStatus,
        authorizationNumber: order.authorizationNumber ?? "",
        notes: order.notes ?? "",
      });
      return;
    }
    reset(emptyDefaults);
  }, [open, mode, order, reset]);

  if (!open) return null;

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createImagingOrderAction(values)
          : await updateImagingOrderAction({ id: order!.id, ...values });
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      onSuccess(
        mode === "create"
          ? "Imaging order created."
          : "Imaging order updated."
      );
      onClose();
    });
  });

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
        aria-labelledby="imaging-form-title"
      >
        <div className="modal-header">
          <h2 id="imaging-form-title" className="modal-title">
            {mode === "create" ? "New imaging order" : "Edit imaging order"}
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

            <FormField
              id="patientReference"
              label="Patient reference (MRN or initials)"
              hint="No full names — use an MRN or initials only."
              error={errors.patientReference?.message}
            >
              <FormInput
                id="patientReference"
                disabled={isPending}
                {...register("patientReference")}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="orderingProvider"
                label="Ordering provider"
                error={errors.orderingProvider?.message}
              >
                <FormInput
                  id="orderingProvider"
                  disabled={isPending}
                  {...register("orderingProvider")}
                />
              </FormField>
              <FormField
                id="imagingType"
                label="Imaging type"
                error={errors.imagingType?.message}
              >
                <FormInput
                  id="imagingType"
                  placeholder="MRI, CT, X-ray…"
                  disabled={isPending}
                  {...register("imagingType")}
                />
              </FormField>
            </div>

            <FormField
              id="imagingLocation"
              label="Imaging location (optional)"
              error={errors.imagingLocation?.message}
            >
              <FormInput
                id="imagingLocation"
                disabled={isPending}
                {...register("imagingLocation")}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                id="dateOrdered"
                label="Date ordered"
                error={errors.dateOrdered?.message}
              >
                <FormInput
                  id="dateOrdered"
                  type="date"
                  disabled={isPending}
                  {...register("dateOrdered")}
                />
              </FormField>
              <FormField
                id="appointmentDate"
                label="Appointment date"
                error={errors.appointmentDate?.message}
              >
                <FormInput
                  id="appointmentDate"
                  type="date"
                  disabled={isPending}
                  {...register("appointmentDate")}
                />
              </FormField>
              <FormField
                id="appointmentTime"
                label="Appointment time"
                error={errors.appointmentTime?.message}
              >
                <FormInput
                  id="appointmentTime"
                  type="time"
                  disabled={isPending}
                  {...register("appointmentTime")}
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="status" label="Status" error={errors.status?.message}>
                <FormSelect id="status" disabled={isPending} {...register("status")}>
                  {IMAGING_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {IMAGING_STATUS_LABELS[status]}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
              <FormField
                id="authorizationStatus"
                label="Authorization"
                error={errors.authorizationStatus?.message}
              >
                <FormSelect
                  id="authorizationStatus"
                  disabled={isPending}
                  {...register("authorizationStatus")}
                >
                  {IMAGING_AUTHORIZATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {IMAGING_AUTHORIZATION_LABELS[status]}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
            </div>

            <FormField
              id="authorizationNumber"
              label="Insurance authorization number (optional)"
              error={errors.authorizationNumber?.message}
            >
              <FormInput
                id="authorizationNumber"
                disabled={isPending}
                {...register("authorizationNumber")}
              />
            </FormField>

            <FormField
              id="notes"
              label="Scheduling notes (optional)"
              hint="Logistics only — no clinical detail."
              error={errors.notes?.message}
            >
              <textarea
                id="notes"
                className="form-input"
                rows={3}
                disabled={isPending}
                {...register("notes")}
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
              {isPending
                ? "Saving…"
                : mode === "create"
                  ? "Create order"
                  : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
