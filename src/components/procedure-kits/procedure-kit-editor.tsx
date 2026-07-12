"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  deactivateProcedureKitAction,
  saveProcedureKitAction,
} from "@/lib/actions/procedure-kits";
import type { ProcedureKitEditorData } from "@/lib/data/procedure-kits";
import {
  procedureKitFormSchema,
  type ProcedureKitFormValues,
} from "@/lib/validation/procedure-kit";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  FormField,
  FormInput,
  FormSection,
  FormSelect,
} from "@/components/ui/form-field";

type ProcedureKitEditorProps = {
  data: ProcedureKitEditorData;
  kitId?: string;
};

const emptyComponent = (): ProcedureKitFormValues["components"][number] => ({
  itemId: "",
  quantity: "1",
  unit: "EA",
  isVariableQuantity: false,
  variableQuantityLabel: "",
  variableQuantityUnit: "",
  calculationType: "",
  multiplier: "",
  concentrationAmount: "",
  concentrationUnit: "mg",
  concentrationVolume: "1",
  concentrationVolumeUnit: "mL",
  required: true,
});

export function ProcedureKitEditor({ data, kitId }: ProcedureKitEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultValues: ProcedureKitFormValues = {
    name: data.kit?.name ?? "",
    description: data.kit?.description ?? "",
    categoryId: data.kit?.categoryId ?? "",
    active: data.kit?.active ?? true,
    defaultLocationId: data.kit?.defaultLocationId ?? "",
    components:
      data.kit?.components.map((c) => ({
        id: c.id,
        itemId: c.itemId,
        quantity: String(c.quantity),
        unit: c.unit,
        isVariableQuantity: c.isVariableQuantity,
        variableQuantityLabel: c.variableQuantityLabel ?? "",
        variableQuantityUnit: c.variableQuantityUnit ?? "",
        calculationType: (c.calculationType as "concentration" | "multiplier") ?? "",
        multiplier: c.multiplier !== null ? String(c.multiplier) : "",
        concentrationAmount:
          c.concentrationAmount !== null ? String(c.concentrationAmount) : "",
        concentrationUnit: c.concentrationUnit ?? "mg",
        concentrationVolume:
          c.concentrationVolume !== null ? String(c.concentrationVolume) : "1",
        concentrationVolumeUnit: c.concentrationVolumeUnit ?? "mL",
        required: c.required,
      })) ?? [emptyComponent()],
  };

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ProcedureKitFormValues>({
    resolver: zodResolver(procedureKitFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "components",
  });

  const watchedComponents = watch("components");

  function onSubmit(values: ProcedureKitFormValues) {
    startTransition(async () => {
      setServerError(null);
      const result = await saveProcedureKitAction({
        id: kitId,
        name: values.name,
        description: values.description || null,
        categoryId: values.categoryId || null,
        active: values.active,
        defaultLocationId: values.defaultLocationId || null,
        components: values.components.map((c) => ({
          id: c.id || undefined,
          itemId: c.itemId,
          quantity: c.isVariableQuantity ? 1 : Number(c.quantity),
          unit: c.unit,
          isVariableQuantity: c.isVariableQuantity,
          variableQuantityLabel: c.isVariableQuantity
            ? c.variableQuantityLabel
            : null,
          variableQuantityUnit: c.isVariableQuantity
            ? c.variableQuantityUnit
            : null,
          calculationType: c.isVariableQuantity
            ? c.calculationType || null
            : null,
          multiplier:
            c.calculationType === "multiplier" && c.multiplier
              ? Number(c.multiplier)
              : null,
          concentrationAmount:
            c.calculationType === "concentration" && c.concentrationAmount
              ? Number(c.concentrationAmount)
              : null,
          concentrationUnit:
            c.calculationType === "concentration"
              ? c.concentrationUnit
              : null,
          concentrationVolume:
            c.calculationType === "concentration" && c.concentrationVolume
              ? Number(c.concentrationVolume)
              : null,
          concentrationVolumeUnit:
            c.calculationType === "concentration"
              ? c.concentrationVolumeUnit
              : null,
          required: c.required,
        })),
      });

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      router.push(`/procedure-kits/${result.kitId}`);
      router.refresh();
    });
  }

  function handleDeactivate() {
    if (!kitId) return;
    if (!window.confirm("Deactivate this kit? It will no longer appear for dispensing.")) {
      return;
    }
    startTransition(async () => {
      const result = await deactivateProcedureKitAction(kitId);
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      router.push("/procedure-kits");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError ? <Alert variant="error" message={serverError} /> : null}

      <FormSection title="Kit details">
        <div className="form-grid">
          <FormField id="name" label="Name" error={errors.name?.message}>
            <FormInput id="name" {...register("name")} disabled={isPending} />
          </FormField>

          <FormField id="categoryId" label="Category">
            <FormSelect id="categoryId" {...register("categoryId")} disabled={isPending}>
              <option value="">None</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField id="defaultLocationId" label="Default location">
            <FormSelect
              id="defaultLocationId"
              {...register("defaultLocationId")}
              disabled={isPending}
            >
              <option value="">None</option>
              {data.locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.locationName}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField id="active" label="Status">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("active")} disabled={isPending} />
              Active
            </label>
          </FormField>
        </div>

        <FormField
          id="description"
          label="Description"
          className="mt-4"
          error={errors.description?.message}
        >
          <textarea
            id="description"
            rows={2}
            className="form-input"
            {...register("description")}
            disabled={isPending}
          />
        </FormField>
      </FormSection>

      <FormSection
        title="Components"
        description="Fixed items use a set quantity. Variable items calculate from the administered amount."
      >
        {errors.components?.message ? (
          <Alert variant="error" message={errors.components.message} />
        ) : null}

        <div className="space-y-4">
          {fields.map((field, index) => {
            const isVariable = watchedComponents[index]?.isVariableQuantity;
            const calcType = watchedComponents[index]?.calculationType;

            return (
              <div key={field.id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="form-grid">
                  <FormField id={`component-item-${index}`} label="Item">
                    <FormSelect
                      {...register(`components.${index}.itemId`)}
                      disabled={isPending}
                    >
                      <option value="">Select item…</option>
                      {data.items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.itemName}
                        </option>
                      ))}
                    </FormSelect>
                  </FormField>

                  <FormField id={`component-type-${index}`} label="Type">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        {...register(`components.${index}.isVariableQuantity`)}
                        disabled={isPending}
                      />
                      Variable quantity
                    </label>
                  </FormField>
                </div>

                {!isVariable ? (
                  <div className="form-grid">
                    <FormField id={`component-qty-${index}`} label="Quantity">
                      <FormInput
                        type="number"
                        min="0"
                        step="any"
                        {...register(`components.${index}.quantity`)}
                        disabled={isPending}
                      />
                    </FormField>
                    <FormField id={`component-unit-${index}`} label="Unit">
                      <FormInput
                        {...register(`components.${index}.unit`)}
                        disabled={isPending}
                      />
                    </FormField>
                  </div>
                ) : (
                  <>
                    <div className="form-grid">
                      <FormField id={`component-vlabel-${index}`} label="Administered label">
                        <FormInput
                          {...register(`components.${index}.variableQuantityLabel`)}
                          placeholder="e.g. Administered amount"
                          disabled={isPending}
                        />
                      </FormField>
                      <FormField id={`component-vunit-${index}`} label="Administered unit">
                        <FormInput
                          {...register(`components.${index}.variableQuantityUnit`)}
                          placeholder="e.g. mg"
                          disabled={isPending}
                        />
                      </FormField>
                      <FormField id={`component-invunit-${index}`} label="Inventory unit">
                        <FormInput
                          {...register(`components.${index}.unit`)}
                          placeholder="e.g. mL"
                          disabled={isPending}
                        />
                      </FormField>
                      <FormField id={`component-calc-${index}`} label="Calculation">
                        <FormSelect
                          {...register(`components.${index}.calculationType`)}
                          disabled={isPending}
                        >
                          <option value="">Select…</option>
                          <option value="concentration">Concentration</option>
                          <option value="multiplier">Multiplier</option>
                        </FormSelect>
                      </FormField>
                    </div>

                    {calcType === "concentration" ? (
                      <div className="form-grid">
                        <FormField id={`component-concamt-${index}`} label="Concentration amount">
                          <FormInput
                            type="number"
                            step="any"
                            {...register(`components.${index}.concentrationAmount`)}
                            disabled={isPending}
                          />
                        </FormField>
                        <FormField id={`component-concunit-${index}`} label="Concentration unit">
                          <FormInput
                            {...register(`components.${index}.concentrationUnit`)}
                            disabled={isPending}
                          />
                        </FormField>
                        <FormField id={`component-concvol-${index}`} label="Per volume">
                          <FormInput
                            type="number"
                            step="any"
                            {...register(`components.${index}.concentrationVolume`)}
                            disabled={isPending}
                          />
                        </FormField>
                        <FormField id={`component-concvolunit-${index}`} label="Volume unit">
                          <FormInput
                            {...register(`components.${index}.concentrationVolumeUnit`)}
                            disabled={isPending}
                          />
                        </FormField>
                      </div>
                    ) : null}

                    {calcType === "multiplier" ? (
                      <FormField id={`component-mult-${index}`} label="Multiplier">
                        <FormInput
                          type="number"
                          step="any"
                          {...register(`components.${index}.multiplier`)}
                          disabled={isPending}
                        />
                      </FormField>
                    ) : null}
                  </>
                )}

                {fields.length > 1 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => remove(index)}
                  >
                    Remove component
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          disabled={isPending}
          onClick={() => append(emptyComponent())}
        >
          Add component
        </Button>
      </FormSection>

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Saving…" : kitId ? "Save kit" : "Create kit"}
        </Button>
        {kitId && data.kit?.active ? (
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
