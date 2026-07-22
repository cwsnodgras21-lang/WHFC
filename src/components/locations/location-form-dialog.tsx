"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createLocationAction,
  updateLocationAction,
} from "@/lib/actions/locations";
import {
  locationToFormDefaults,
  type LocationRow,
} from "@/lib/data/locations-page";
import {
  locationFormSchema,
  type LocationFormValues,
} from "@/lib/validation/location";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, FormInput } from "@/components/ui/form-field";

type LocationFormDialogProps = {
  open: boolean;
  mode: "create" | "edit" | "view";
  location: LocationRow | null;
  canManage: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

const emptyDefaults: LocationFormValues = {
  locationName: "",
  active: true,
};

export function LocationFormDialog({
  open,
  mode,
  location,
  canManage,
  onClose,
  onSuccess,
}: LocationFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const readOnly = mode === "view" || !canManage;
  const identityLocked = mode !== "create" && Boolean(location?.hasTransactions);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if ((mode === "edit" || mode === "view") && location) {
      reset(locationToFormDefaults(location));
      return;
    }

    reset(emptyDefaults);
  }, [open, mode, location, reset]);

  const title = useMemo(() => {
    if (mode === "view") {
      return "Location details";
    }
    return mode === "create" ? "New location" : "Edit location";
  }, [mode]);

  if (!open) {
    return null;
  }

  const handleClose = () => {
    if (isPending) {
      return;
    }
    setServerError(null);
    onClose();
  };

  const onSubmit = handleSubmit((values) => {
    if (readOnly) {
      return;
    }

    setServerError(null);
    startTransition(async () => {
      const payload = {
        locationName: values.locationName.trim(),
        active: values.active,
      };

      const result =
        mode === "create"
          ? await createLocationAction(payload)
          : await updateLocationAction({ id: location!.id, ...payload });

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      onSuccess(
        mode === "create"
          ? `Created location "${values.locationName.trim()}".`
          : `Updated location "${values.locationName.trim()}".`
      );
      onClose();
    });
  });

  const fieldDisabled = readOnly || isPending || identityLocked;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isPending) {
          handleClose();
        }
      }}
    >
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-form-title"
      >
        <div className="modal-header">
          <h2 id="location-form-title" className="modal-title">
            {title}
            {mode !== "create" && location && !location.active ? (
              <span className="ml-2 text-sm font-normal text-[var(--color-fg-muted)]">
                (Inactive)
              </span>
            ) : null}
          </h2>
          <Button
            type="button"
            variant="icon"
            aria-label="Close"
            disabled={isPending}
            onClick={handleClose}
          >
            x
          </Button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="modal-body space-y-4">
            {serverError ? <Alert variant="error" message={serverError} /> : null}
            {mode !== "create" && location && !location.active ? (
              <Alert
                variant="warning"
                message="This location is inactive and will not appear in receive or consume pick lists."
              />
            ) : null}
            {identityLocked ? (
              <Alert
                variant="info"
                message="Location identity cannot be changed after inventory transactions exist for this location. You can still activate or deactivate it."
              />
            ) : null}

            <FormField
              id="locationName"
              label="Location name"
              error={errors.locationName?.message}
            >
              <FormInput
                id="locationName"
                disabled={fieldDisabled}
                aria-invalid={Boolean(errors.locationName)}
                {...register("locationName")}
              />
            </FormField>

            <label className="flex items-center gap-2 text-sm text-[var(--color-fg)]">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--color-border)]"
                disabled={readOnly || isPending}
                {...register("active")}
              />
              Active in catalog
            </label>
          </div>

          <div className="modal-footer">
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={handleClose}
            >
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly ? (
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Saving..."
                  : mode === "create"
                    ? "Create location"
                    : "Save changes"}
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
