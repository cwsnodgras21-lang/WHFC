"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { dispenseKitAction } from "@/lib/actions/dispense-kit";
import {
  calculateKitImpact,
  type CalculatedLine,
} from "@/lib/dispense/calculate";
import type {
  DispenseKitOption,
  DispenseLocationOption,
  DispenseLotOption,
} from "@/lib/data/dispense";
import {
  getFefoExpiredWarning,
  getOnHandForItem,
} from "@/lib/data/dispense";
import { formatLocationDetail, formatQuantity } from "@/lib/format/inventory";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  FormField,
  FormInput,
  FormSection,
  FormSelect,
} from "@/components/ui/form-field";
import { PageSection } from "@/components/ui/page-section";

type DispenseKitFormProps = {
  kits: DispenseKitOption[];
  locations: DispenseLocationOption[];
  onHandByKey: Record<string, number>;
  lots: DispenseLotOption[];
};

type Step = "select" | "review";

export function DispenseKitForm({
  kits,
  locations,
  onHandByKey,
  lots,
}: DispenseKitFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("select");
  const [kitId, setKitId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [administeredAmounts, setAdministeredAmounts] = useState<
    Record<string, string>
  >({});
  const [allowExpired, setAllowExpired] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedKit = useMemo(
    () => kits.find((k) => k.id === kitId) ?? null,
    [kits, kitId]
  );

  const variableComponents = useMemo(
    () =>
      selectedKit?.components.filter((c) => c.isVariableQuantity) ?? [],
    [selectedKit]
  );

  const impactLines = useMemo(() => {
    if (!selectedKit) return [];
    const amounts: Record<string, number> = {};
    for (const c of variableComponents) {
      const val = Number(administeredAmounts[c.id]);
      if (!Number.isNaN(val) && val > 0) {
        amounts[c.id] = val;
      }
    }
    return calculateKitImpact(selectedKit.components, amounts);
  }, [selectedKit, variableComponents, administeredAmounts]);

  const impactWithDetails = useMemo(() => {
    if (!selectedKit || !locationId) return [];
    return impactLines.map((line) => {
      const component = selectedKit.components.find(
        (c) => c.id === line.componentId
      );
      if (!component) return null;
      const onHand = getOnHandForItem(
        onHandByKey,
        component.itemId,
        locationId
      );
      const insufficient = line.quantityToConsume > onHand;
      const expiredWarning = getFefoExpiredWarning(
        lots,
        component.itemId,
        locationId
      );
      return {
        ...line,
        itemName: component.itemName,
        onHand,
        insufficient,
        expiredWarning,
      };
    }).filter(Boolean) as (CalculatedLine & {
      itemName: string;
      onHand: number;
      insufficient: boolean;
      expiredWarning: boolean;
    })[];
  }, [impactLines, selectedKit, locationId, onHandByKey, lots]);

  const hasExpiredWarning = impactWithDetails.some((l) => l.expiredWarning);
  const hasInsufficient = impactWithDetails.some((l) => l.insufficient);
  const variableComplete =
    variableComponents.length === 0 ||
    variableComponents.every((c) => {
      const val = Number(administeredAmounts[c.id]);
      return !Number.isNaN(val) && val > 0;
    });

  const canReview =
    kitId &&
    locationId &&
    variableComplete &&
    impactLines.length === (selectedKit?.components.length ?? 0);

  function handleKitChange(newKitId: string) {
    setKitId(newKitId);
    setStep("select");
    setServerError(null);
    setSuccessMessage(null);
    const kit = kits.find((k) => k.id === newKitId);
    if (kit?.defaultLocationId) {
      setLocationId(kit.defaultLocationId);
    }
    setAdministeredAmounts({});
  }

  function handleReview() {
    if (!canReview) return;
    setServerError(null);
    setStep("review");
  }

  function handleConfirm() {
    if (!selectedKit || !locationId) return;

    const amounts = variableComponents.map((c) => ({
      componentId: c.id,
      amount: Number(administeredAmounts[c.id]),
    }));

    startTransition(async () => {
      setServerError(null);
      const result = await dispenseKitAction({
        procedureKitId: kitId,
        locationId,
        administeredAmounts: amounts,
        performedAt: new Date(),
        allowExpired: allowExpired || undefined,
      });

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      setSuccessMessage(
        result.idempotentReplay
          ? "Dispense already recorded (duplicate request)."
          : `${selectedKit.name} dispensed successfully.`
      );
      setKitId("");
      setLocationId("");
      setAdministeredAmounts({});
      setAllowExpired(false);
      setStep("select");
      router.refresh();
    });
  }

  const formDisabled = kits.length === 0 || locations.length === 0;

  return (
    <div className="space-y-6">
      {serverError ? <Alert variant="error" message={serverError} /> : null}
      {successMessage ? (
        <Alert variant="success" message={successMessage} />
      ) : null}

      {formDisabled ? (
        <PageSection title="No kits available">
          <p className="text-sm text-muted">
            Add active procedure kits before dispensing inventory.
          </p>
        </PageSection>
      ) : (
        <>
          {step === "select" ? (
            <FormSection title="Dispense kit" description="Select a kit and location.">
              <div className="form-grid">
                <FormField id="procedureKitId" label="Procedure kit">
                  <FormSelect
                    id="procedureKitId"
                    value={kitId}
                    disabled={isPending}
                    onChange={(e) => handleKitChange(e.target.value)}
                  >
                    <option value="">Select a kit…</option>
                    {kits.map((kit) => (
                      <option key={kit.id} value={kit.id}>
                        {kit.name}
                      </option>
                    ))}
                  </FormSelect>
                </FormField>

                <FormField id="locationId" label="Location">
                  <FormSelect
                    id="locationId"
                    value={locationId}
                    disabled={isPending || !kitId}
                    onChange={(e) => setLocationId(e.target.value)}
                  >
                    <option value="">Select a location…</option>
                    {locations.map((loc) => {
                      const detail = formatLocationDetail(
                        loc.locationName,
                        loc.room,
                        null
                      );
                      return (
                        <option key={loc.id} value={loc.id}>
                          {detail.secondary
                            ? `${detail.primary} — ${detail.secondary}`
                            : detail.primary}
                        </option>
                      );
                    })}
                  </FormSelect>
                </FormField>
              </div>

              {variableComponents.length > 0 ? (
                <div className="form-grid mt-4">
                  {variableComponents.map((component) => (
                    <FormField
                      key={component.id}
                      id={`amount-${component.id}`}
                      label={
                        component.variableQuantityLabel ??
                        "Administered amount"
                      }
                    >
                      <div className="flex items-center gap-2">
                        <FormInput
                          id={`amount-${component.id}`}
                          type="number"
                          min="0"
                          step="any"
                          disabled={isPending}
                          value={administeredAmounts[component.id] ?? ""}
                          onChange={(e) =>
                            setAdministeredAmounts((prev) => ({
                              ...prev,
                              [component.id]: e.target.value,
                            }))
                          }
                        />
                        <span className="text-sm text-muted shrink-0">
                          {component.variableQuantityUnit}
                        </span>
                      </div>
                    </FormField>
                  ))}
                </div>
              ) : null}

              {canReview && impactWithDetails.length > 0 ? (
                <ImpactPreview lines={impactWithDetails} />
              ) : null}

              <div className="mt-6 flex gap-3">
                <Button
                  type="button"
                  variant="primary"
                  disabled={!canReview || isPending}
                  onClick={handleReview}
                >
                  Review dispense
                </Button>
              </div>
            </FormSection>
          ) : (
            <FormSection
              title="Confirm dispense"
              description={`Review inventory impact for ${selectedKit?.name}.`}
            >
              {variableComponents.map((c) => (
                <p key={c.id} className="text-sm">
                  <span className="font-medium">
                    {c.variableQuantityLabel ?? "Administered amount"}:
                  </span>{" "}
                  {administeredAmounts[c.id]} {c.variableQuantityUnit}
                </p>
              ))}

              <ImpactPreview lines={impactWithDetails} className="mt-4" />

              {hasExpiredWarning && !allowExpired ? (
                <Alert
                  variant="warning"
                  className="mt-4"
                  message="The first-available lot for one or more items has expired. Confirm below to decrement inventory from expired stock."
                />
              ) : null}

              {hasInsufficient ? (
                <Alert
                  variant="error"
                  className="mt-4"
                  message="Insufficient stock for one or more components at this location."
                />
              ) : null}

              {hasExpiredWarning ? (
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={allowExpired}
                    onChange={(e) => setAllowExpired(e.target.checked)}
                    disabled={isPending}
                  />
                  Use expired stock (first-expiring lot)
                </label>
              ) : null}

              <div className="mt-6 flex gap-3">
                <Button
                  type="button"
                  variant="primary"
                  disabled={
                    isPending || hasInsufficient || (hasExpiredWarning && !allowExpired)
                  }
                  onClick={handleConfirm}
                >
                  {isPending ? "Dispensing…" : "Confirm dispense"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => setStep("select")}
                >
                  Back
                </Button>
              </div>
            </FormSection>
          )}
        </>
      )}
    </div>
  );
}

function ImpactPreview({
  lines,
  className,
}: {
  lines: (CalculatedLine & {
    itemName: string;
    onHand: number;
    insufficient: boolean;
    expiredWarning: boolean;
  })[];
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="text-sm font-medium mb-2">Inventory impact</h3>
      <ul className="space-y-1 text-sm">
        {lines.map((line) => (
          <li
            key={line.componentId}
            className={
              line.insufficient ? "text-danger" : line.expiredWarning ? "text-warning" : undefined
            }
          >
            <span className="font-medium">{line.itemName}:</span>{" "}
            {formatQuantity(line.quantityToConsume)} {line.unit}
            {line.administeredAmount !== undefined ? (
              <span className="text-muted">
                {" "}
                (from {formatQuantity(line.administeredAmount)}{" "}
                {line.administeredUnit})
              </span>
            ) : null}
            {line.insufficient ? (
              <span className="text-muted">
                {" "}
                — only {formatQuantity(line.onHand)} available
              </span>
            ) : null}
            {line.expiredWarning && !line.insufficient ? (
              <span className="text-muted"> — expired lot first</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
