"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createItemAction,
  updateItemAction,
} from "@/lib/actions/items";
import { quickCreateCategoryAction } from "@/lib/actions/categories";
import { quickCreateVendorAction } from "@/lib/actions/vendors";
import {
  buildItemFormOptions,
  itemToFormDefaults,
  type ItemCatalogRow,
  type ReferenceDataSnapshot,
} from "@/lib/data/items-page";
import {
  formValuesToCreateInput,
  formValuesToUpdateInput,
  itemFormSchema,
  type ItemFormValues,
} from "@/lib/validation/item";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, FormInput } from "@/components/ui/form-field";

type ItemFormDialogProps = {
  open: boolean;
  mode: "create" | "edit" | "view";
  item: ItemCatalogRow | null;
  referenceData: ReferenceDataSnapshot;
  canManage: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

const emptyDefaults: ItemFormValues = {
  itemName: "",
  internalSku: "",
  categoryId: "",
  unitOfMeasureId: "",
  preferredVendorId: "",
  reorderPoint: "0",
  parLevel: "0",
  active: true,
  trackExpiration: false,
  trackLotNumber: false,
  expirationWarningDays: "90",
  packQuantity: "",
};

export function ItemFormDialog({
  open,
  mode,
  item,
  referenceData,
  canManage,
  onClose,
  onSuccess,
}: ItemFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [extraReference, setExtraReference] = useState<ReferenceDataSnapshot>({
    categories: [],
    units: [],
    vendors: [],
  });
  const [showQuickCategory, setShowQuickCategory] = useState(false);
  const [showQuickVendor, setShowQuickVendor] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState("");
  const [quickVendorName, setQuickVendorName] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);

  const readOnly = mode === "view" || !canManage;

  const mergedReference = useMemo<ReferenceDataSnapshot>(() => ({
    categories: [
      ...referenceData.categories,
      ...extraReference.categories.filter(
        (row) => !referenceData.categories.some((existing) => existing.id === row.id)
      ),
    ],
    units: [
      ...referenceData.units,
      ...extraReference.units.filter(
        (row) => !referenceData.units.some((existing) => existing.id === row.id)
      ),
    ],
    vendors: [
      ...referenceData.vendors,
      ...extraReference.vendors.filter(
        (row) => !referenceData.vendors.some((existing) => existing.id === row.id)
      ),
    ],
  }), [referenceData, extraReference]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: emptyDefaults,
  });

  const watchedCategoryId = watch("categoryId");
  const watchedUnitId = watch("unitOfMeasureId");
  const watchedVendorId = watch("preferredVendorId");
  const watchedTrackExpiration = watch("trackExpiration");

  const formOptions = useMemo(
    () =>
      buildItemFormOptions(mergedReference, {
        categoryId: watchedCategoryId,
        unitOfMeasureId: watchedUnitId,
        preferredVendorId: watchedVendorId || null,
      }),
    [mergedReference, watchedCategoryId, watchedUnitId, watchedVendorId]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setExtraReference({ categories: [], units: [], vendors: [] });
    setShowQuickCategory(false);
    setShowQuickVendor(false);
    setQuickCategoryName("");
    setQuickVendorName("");
    setQuickError(null);

    if ((mode === "edit" || mode === "view") && item) {
      reset(itemToFormDefaults(item));
      return;
    }

    reset(emptyDefaults);
  }, [open, mode, item, reset]);

  const handleClose = () => {
    if (isPending) {
      return;
    }
    setServerError(null);
    onClose();
  };

  if (!open) {
    return null;
  }

  const unitLocked = mode !== "create" && Boolean(item?.hasTransactions);
  const title =
    mode === "view"
      ? "Item details"
      : mode === "create"
        ? "New item"
        : "Edit item";

  const onSubmit = handleSubmit((values) => {
    if (readOnly) {
      return;
    }

    setServerError(null);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createItemAction(formValuesToCreateInput(values))
          : await updateItemAction(
              formValuesToUpdateInput(item!.id, values)
            );

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      onSuccess(
        mode === "create"
          ? `Created item "${values.itemName.trim()}".`
          : `Updated item "${values.itemName.trim()}".`
      );
      onClose();
    });
  });

  const handleQuickCategory = () => {
    setQuickError(null);
    startTransition(async () => {
      const result = await quickCreateCategoryAction({ name: quickCategoryName });
      if (!result.success) {
        setQuickError(result.error);
        return;
      }
      const name = quickCategoryName.trim();
      setExtraReference((prev) => ({
        ...prev,
        categories: [
          ...prev.categories,
          { id: result.categoryId, name, active: true },
        ],
      }));
      setValue("categoryId", result.categoryId, { shouldValidate: true });
      setShowQuickCategory(false);
      setQuickCategoryName("");
    });
  };

  const handleQuickVendor = () => {
    setQuickError(null);
    startTransition(async () => {
      const result = await quickCreateVendorAction({ name: quickVendorName });
      if (!result.success) {
        setQuickError(result.error);
        return;
      }
      const name = quickVendorName.trim();
      setExtraReference((prev) => ({
        ...prev,
        vendors: [
          ...prev.vendors,
          { id: result.vendorId, name, active: true },
        ],
      }));
      setValue("preferredVendorId", result.vendorId, { shouldValidate: true });
      setShowQuickVendor(false);
      setQuickVendorName("");
    });
  };

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
        aria-labelledby="item-form-title"
      >
        <div className="modal-header">
          <h2 id="item-form-title" className="modal-title">
            {title}
            {mode !== "create" && item && !item.active ? (
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
            ×
          </Button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="modal-body space-y-4">
            {serverError ? <Alert variant="error" message={serverError} /> : null}
            {quickError ? <Alert variant="error" message={quickError} /> : null}
            {mode !== "create" && item && !item.active ? (
              <Alert
                variant="warning"
                message="This item is inactive and will not appear in receive or consume pick lists."
              />
            ) : null}

            <FormField
              id="itemName"
              label="Item name"
              error={errors.itemName?.message}
            >
              <FormInput
                id="itemName"
                disabled={readOnly || isPending}
                aria-invalid={Boolean(errors.itemName)}
                {...register("itemName")}
              />
            </FormField>

            <FormField
              id="internalSku"
              label="Product code"
              error={errors.internalSku?.message}
            >
              <FormInput
                id="internalSku"
                disabled={readOnly || isPending}
                aria-invalid={Boolean(errors.internalSku)}
                {...register("internalSku")}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="categoryId"
                label="Category"
                error={errors.categoryId?.message}
              >
                <div className="field-with-action">
                  <select
                    id="categoryId"
                    className="form-select"
                    disabled={readOnly || isPending || formOptions.categories.length === 0}
                    aria-invalid={Boolean(errors.categoryId)}
                    {...register("categoryId")}
                  >
                    <option value="">Select category</option>
                    {formOptions.categories.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {canManage && !readOnly ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setQuickError(null);
                        setShowQuickCategory((prev) => !prev);
                        setShowQuickVendor(false);
                      }}
                    >
                      Add category
                    </Button>
                  ) : null}
                </div>
              </FormField>

              <FormField
                id="unitOfMeasureId"
                label="Stocking unit"
                error={errors.unitOfMeasureId?.message}
              >
                <select
                  id="unitOfMeasureId"
                  className="form-select"
                  disabled={
                    readOnly ||
                    isPending ||
                    unitLocked ||
                    formOptions.units.length === 0
                  }
                  aria-invalid={Boolean(errors.unitOfMeasureId)}
                  {...register("unitOfMeasureId")}
                >
                  <option value="">Select unit</option>
                  {formOptions.units.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {showQuickCategory && canManage && !readOnly ? (
              <div className="rounded-md border border-[var(--color-border-subtle)] p-3 space-y-2">
                <FormField id="quickCategoryName" label="New category name">
                  <div className="field-with-action">
                    <FormInput
                      id="quickCategoryName"
                      value={quickCategoryName}
                      onChange={(event) => setQuickCategoryName(event.target.value)}
                      disabled={isPending}
                    />
                    <Button type="button" disabled={isPending} onClick={handleQuickCategory}>
                      Save
                    </Button>
                  </div>
                </FormField>
              </div>
            ) : null}

            {unitLocked ? (
              <Alert
                variant="info"
                message="Stocking unit cannot be changed after inventory transactions exist for this item."
              />
            ) : null}

            <FormField
              id="preferredVendorId"
              label="Preferred vendor (optional)"
              error={errors.preferredVendorId?.message}
            >
              <div className="field-with-action">
                <select
                  id="preferredVendorId"
                  className="form-select"
                  disabled={readOnly || isPending}
                  {...register("preferredVendorId")}
                >
                  <option value="">None</option>
                  {formOptions.vendors.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {canManage && !readOnly ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setQuickError(null);
                      setShowQuickVendor((prev) => !prev);
                      setShowQuickCategory(false);
                    }}
                  >
                    Add vendor
                  </Button>
                ) : null}
              </div>
            </FormField>

            {showQuickVendor && canManage && !readOnly ? (
              <div className="rounded-md border border-[var(--color-border-subtle)] p-3 space-y-2">
                <FormField id="quickVendorName" label="New vendor name">
                  <div className="field-with-action">
                    <FormInput
                      id="quickVendorName"
                      value={quickVendorName}
                      onChange={(event) => setQuickVendorName(event.target.value)}
                      disabled={isPending}
                    />
                    <Button type="button" disabled={isPending} onClick={handleQuickVendor}>
                      Save
                    </Button>
                  </div>
                </FormField>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="reorderPoint"
                label="Reorder point"
                error={errors.reorderPoint?.message}
              >
                <FormInput
                  id="reorderPoint"
                  type="number"
                  min={0}
                  step="any"
                  disabled={readOnly || isPending}
                  aria-invalid={Boolean(errors.reorderPoint)}
                  {...register("reorderPoint")}
                />
              </FormField>

              <FormField
                id="parLevel"
                label="Par level"
                error={errors.parLevel?.message}
              >
                <FormInput
                  id="parLevel"
                  type="number"
                  min={0}
                  step="any"
                  disabled={readOnly || isPending}
                  aria-invalid={Boolean(errors.parLevel)}
                  {...register("parLevel")}
                />
              </FormField>
            </div>

            <FormField
              id="packQuantity"
              label="Pack quantity (optional)"
              error={errors.packQuantity?.message}
            >
              <FormInput
                id="packQuantity"
                type="number"
                min={1}
                step={1}
                placeholder="e.g. 20 syringes per box"
                disabled={readOnly || isPending}
                aria-invalid={Boolean(errors.packQuantity)}
                {...register("packQuantity")}
              />
            </FormField>
            <p className="form-hint -mt-2">
              How many individual items are in one stocking unit (e.g. 20
              syringes per box). Shown on Receive to help total up what
              arrived. Leave blank if not applicable.
            </p>

            <div className="rounded-md border border-[var(--color-border-subtle)] p-3 space-y-3">
              <p className="text-sm font-semibold text-[var(--color-fg)]">
                Expiration &amp; lot tracking
              </p>
              <p className="form-hint -mt-2">
                Turn these on for items that expire (medications, lab supplies,
                tests). Staff will be asked for these details when receiving.
              </p>

              <label className="flex items-center gap-2 text-sm text-[var(--color-fg)]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--color-border)]"
                  disabled={readOnly || isPending}
                  {...register("trackExpiration")}
                />
                Track expiration date
              </label>

              <label className="flex items-center gap-2 text-sm text-[var(--color-fg)]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--color-border)]"
                  disabled={readOnly || isPending}
                  {...register("trackLotNumber")}
                />
                Require lot number
              </label>

              {watchedTrackExpiration ? (
                <FormField
                  id="expirationWarningDays"
                  label="Warn when expiring within (days)"
                  error={errors.expirationWarningDays?.message}
                >
                  <FormInput
                    id="expirationWarningDays"
                    type="number"
                    min={1}
                    step={1}
                    disabled={readOnly || isPending}
                    aria-invalid={Boolean(errors.expirationWarningDays)}
                    {...register("expirationWarningDays")}
                  />
                </FormField>
              ) : null}
            </div>

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
                  ? "Saving…"
                  : mode === "create"
                    ? "Create item"
                    : "Save changes"}
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
