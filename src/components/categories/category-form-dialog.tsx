"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createCategoryAction,
  updateCategoryAction,
} from "@/lib/actions/categories";
import type { CategoryRow } from "@/lib/data/categories-page";
import {
  categoryFormSchema,
  type CategoryFormValues,
} from "@/lib/validation/category";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, FormInput } from "@/components/ui/form-field";

type CategoryFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  category: CategoryRow | null;
  readOnly?: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

const emptyDefaults: CategoryFormValues = {
  name: "",
  description: "",
  active: true,
};

export function CategoryFormDialog({
  open,
  mode,
  category,
  readOnly = false,
  onClose,
  onSuccess,
}: CategoryFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && category) {
      reset({
        name: category.name,
        description: category.description ?? "",
        active: category.active,
      });
      return;
    }
    reset(emptyDefaults);
  }, [open, mode, category, reset]);

  const title = useMemo(() => {
    if (readOnly) return "Category details";
    return mode === "create" ? "New category" : "Edit category";
  }, [mode, readOnly]);

  if (!open) return null;

  const disabled = readOnly || isPending;

  const onSubmit = handleSubmit((values) => {
    if (readOnly) return;
    setServerError(null);
    startTransition(async () => {
      const payload = {
        name: values.name.trim(),
        description: values.description?.trim() ? values.description.trim() : null,
        active: values.active,
      };

      const result =
        mode === "create"
          ? await createCategoryAction(payload)
          : await updateCategoryAction({ id: category!.id, ...payload });

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      onSuccess(
        mode === "create"
          ? `Created category "${values.name.trim()}".`
          : `Updated category "${values.name.trim()}".`
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
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="category-form-title">
        <div className="modal-header">
          <h2 id="category-form-title" className="modal-title">{title}</h2>
          <Button type="button" variant="icon" aria-label="Close" disabled={isPending} onClick={onClose}>×</Button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body space-y-4">
            {serverError ? <Alert variant="error" message={serverError} /> : null}
            <FormField id="categoryName" label="Name" error={errors.name?.message}>
              <FormInput id="categoryName" disabled={disabled} {...register("name")} />
            </FormField>
            <FormField id="categoryDescription" label="Description (optional)" error={errors.description?.message}>
              <FormInput id="categoryDescription" disabled={disabled} {...register("description")} />
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" disabled={disabled} {...register("active")} />
              Active
            </label>
          </div>
          <div className="modal-footer">
            <Button type="button" variant="secondary" disabled={isPending} onClick={onClose}>
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly ? (
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : mode === "create" ? "Create category" : "Save changes"}
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
