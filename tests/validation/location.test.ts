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
      room: "",
      cabinet: "",
      shelf: "",
      bin: "",
      active: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Enter a location name.");
    }
  });

  it("normalizes optional fields to null for create", () => {
    const result = createLocationSchema.parse({
      locationName: " Supply Closet ",
      room: " ",
      cabinet: "A",
      shelf: "",
      bin: " 12 ",
      active: true,
    });

    expect(result).toEqual({
      locationName: "Supply Closet",
      room: null,
      cabinet: "A",
      shelf: null,
      bin: "12",
      active: true,
    });
  });

  it("requires a valid id for update", () => {
    const result = updateLocationSchema.safeParse({
      id: "not-a-uuid",
      locationName: "Supply Closet",
      room: null,
      cabinet: null,
      shelf: null,
      bin: null,
      active: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Invalid location.");
    }
  });
});
