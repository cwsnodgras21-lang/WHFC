import { describe, expect, it } from "vitest";

import { buildFormSelectOptions } from "@/lib/reference/form-options";
import { buildItemFormOptions } from "@/lib/data/items-page";

describe("buildFormSelectOptions", () => {
  it("includes only active rows when nothing is selected", () => {
    const options = buildFormSelectOptions(
      [
        { id: "1", name: "Active", active: true },
        { id: "2", name: "Inactive", active: false },
      ],
      null,
      (row) => row.name
    );

    expect(options).toHaveLength(1);
    expect(options[0]?.id).toBe("1");
  });

  it("includes the selected inactive row when editing", () => {
    const options = buildFormSelectOptions(
      [
        { id: "1", name: "Active", active: true },
        { id: "2", name: "Legacy", active: false },
      ],
      "2",
      (row) => row.name
    );

    expect(options).toHaveLength(2);
    expect(options.some((option) => option.id === "2")).toBe(true);
    expect(options.find((option) => option.id === "2")?.label).toContain(
      "inactive"
    );
  });
});

describe("buildItemFormOptions", () => {
  it("surfaces a newly created category in item form options", () => {
    const options = buildItemFormOptions(
      {
        categories: [{ id: "cat-1", name: "Gloves", active: true }],
        units: [{ id: "unit-1", name: "Box", abbreviation: "bx", active: true }],
        vendors: [],
      },
      { categoryId: "cat-1" }
    );

    expect(options.categories.some((row) => row.id === "cat-1")).toBe(true);
  });

  it("includes vendor options for item preferred vendor dropdown", () => {
    const options = buildItemFormOptions(
      {
        categories: [],
        units: [],
        vendors: [{ id: "vendor-1", name: "MedSupply Co", active: true }],
      },
      { preferredVendorId: "vendor-1" }
    );

    expect(options.vendors).toEqual([
      { id: "vendor-1", label: "MedSupply Co", active: true },
    ]);
  });
});
