export type KitComponentForCalculation = {
  id: string;
  quantity: number;
  unit: string;
  isVariableQuantity: boolean;
  variableQuantityLabel: string | null;
  variableQuantityUnit: string | null;
  calculationType: string | null;
  multiplier: number | null;
  concentrationAmount: number | null;
  concentrationUnit: string | null;
  concentrationVolume: number | null;
  concentrationVolumeUnit: string | null;
};

export type CalculatedLine = {
  componentId: string;
  quantityToConsume: number;
  unit: string;
  administeredAmount?: number;
  administeredUnit?: string;
};

/**
 * quantity_to_consume = administered_amount / concentration_amount * concentration_volume
 */
export function calculateComponentQuantity(
  component: KitComponentForCalculation,
  administeredAmount?: number
): CalculatedLine | null {
  if (!component.isVariableQuantity) {
    return {
      componentId: component.id,
      quantityToConsume: component.quantity,
      unit: component.unit,
    };
  }

  if (administeredAmount === undefined || administeredAmount <= 0) {
    return null;
  }

  let quantityToConsume: number;

  if (component.calculationType === "concentration") {
    if (
      !component.concentrationAmount ||
      !component.concentrationVolume ||
      component.concentrationAmount <= 0 ||
      component.concentrationVolume <= 0
    ) {
      return null;
    }
    quantityToConsume =
      (administeredAmount / component.concentrationAmount) *
      component.concentrationVolume;
  } else if (component.calculationType === "multiplier") {
    if (!component.multiplier || component.multiplier <= 0) {
      return null;
    }
    quantityToConsume = administeredAmount * component.multiplier;
  } else {
    return null;
  }

  return {
    componentId: component.id,
    quantityToConsume,
    unit: component.unit,
    administeredAmount,
    administeredUnit: component.variableQuantityUnit ?? undefined,
  };
}

export function calculateKitImpact(
  components: KitComponentForCalculation[],
  administeredAmounts: Record<string, number>
): CalculatedLine[] {
  const lines: CalculatedLine[] = [];

  for (const component of components) {
    const administered = component.isVariableQuantity
      ? administeredAmounts[component.id]
      : undefined;
    const line = calculateComponentQuantity(component, administered);
    if (line) {
      lines.push(line);
    }
  }

  return lines;
}
