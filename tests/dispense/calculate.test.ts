import { describe, expect, it } from "vitest";

import {
  calculateComponentQuantity,
  calculateKitImpact,
  type KitComponentForCalculation,
} from "@/lib/dispense/calculate";

const testosteroneMed: KitComponentForCalculation = {
  id: "var-1",
  quantity: 1,
  unit: "mL",
  isVariableQuantity: true,
  variableQuantityLabel: "Administered amount",
  variableQuantityUnit: "mg",
  calculationType: "concentration",
  multiplier: null,
  concentrationAmount: 200,
  concentrationUnit: "mg",
  concentrationVolume: 1,
  concentrationVolumeUnit: "mL",
};

const fixedSyringe: KitComponentForCalculation = {
  id: "fix-1",
  quantity: 1,
  unit: "EA",
  isVariableQuantity: false,
  variableQuantityLabel: null,
  variableQuantityUnit: null,
  calculationType: null,
  multiplier: null,
  concentrationAmount: null,
  concentrationUnit: null,
  concentrationVolume: null,
  concentrationVolumeUnit: null,
};

describe("calculateComponentQuantity", () => {
  it("returns fixed quantity for non-variable components", () => {
    const result = calculateComponentQuantity(fixedSyringe);
    expect(result).toEqual({
      componentId: "fix-1",
      quantityToConsume: 1,
      unit: "EA",
    });
  });

  it("calculates concentration-based inventory decrement", () => {
    const result = calculateComponentQuantity(testosteroneMed, 100);
    expect(result?.quantityToConsume).toBe(0.5);
    expect(result?.unit).toBe("mL");
    expect(result?.administeredAmount).toBe(100);
    expect(result?.administeredUnit).toBe("mg");
  });

  it("returns null when variable amount is missing", () => {
    expect(calculateComponentQuantity(testosteroneMed)).toBeNull();
  });
});

describe("calculateKitImpact", () => {
  it("builds impact lines for fixed and variable components", () => {
    const lines = calculateKitImpact(
      [testosteroneMed, fixedSyringe],
      { "var-1": 100 }
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]?.quantityToConsume).toBe(0.5);
    expect(lines[1]?.quantityToConsume).toBe(1);
  });
});
