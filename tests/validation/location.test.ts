import { describe, expect, it } from "vitest";

import {
  createLocationSchema,
  locationFormSchema,
  updateLocationSchema,
} from "@/lib/validation/location";

describe("location validation", () => {
  it("requires a location name", () => {
    const result = locationFormSchema.safeParse({
      locationName: "",
      active: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Enter a location name.");
    }
  });

  it("normalizes the name for create", () => {
    const result = createLocationSchema.parse({
      locationName: " Supply Closet ",
      active: true,
    });

    expect(result).toEqual({
      locationName: "Supply Closet",
      active: true,
    });
  });

  it("requires a valid id for update", () => {
    const result = updateLocationSchema.safeParse({
      id: "not-a-uuid",
      locationName: "Supply Closet",
      active: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Invalid location.");
    }
  });
});
