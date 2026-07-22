import { z } from "zod";

import { isSafeHttpUrl } from "@/lib/security/safe-url";

const optionalEmail = z.union([z.literal(""), z.string().trim().email("Enter a valid email.")]);

const optionalWebsite = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .max(2048, "Website URL is too long.")
    .refine(isSafeHttpUrl, "Enter a valid http(s) URL."),
]);

const vendorPayload = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a vendor name.")
    .max(120, "Name is too long."),
  contactEmail: z.string().trim().nullable().optional(),
  contactPhone: z.string().trim().max(32, "Phone number is too long.").nullable().optional(),
  website: z.string().trim().nullable().optional(),
  active: z.boolean(),
});

export const vendorFormSchema = z.object({
  name: vendorPayload.shape.name,
  contactEmail: optionalEmail.optional(),
  contactPhone: z
    .string()
    .trim()
    .max(32, "Phone number is too long.")
    .optional()
    .or(z.literal("")),
  website: optionalWebsite.optional(),
  active: z.boolean(),
});

export const createVendorSchema = vendorPayload.transform((data) => ({
  name: data.name.trim(),
  contactEmail: data.contactEmail?.trim() ? data.contactEmail.trim() : null,
  contactPhone: data.contactPhone?.trim() ? data.contactPhone.trim() : null,
  website: data.website?.trim() ? data.website.trim() : null,
  active: data.active,
}));

export const updateVendorSchema = vendorPayload
  .extend({ id: z.uuid("Invalid vendor.") })
  .transform((data) => ({
    id: data.id,
    name: data.name.trim(),
    contactEmail: data.contactEmail?.trim() ? data.contactEmail.trim() : null,
    contactPhone: data.contactPhone?.trim() ? data.contactPhone.trim() : null,
    website: data.website?.trim() ? data.website.trim() : null,
    active: data.active,
  }));

export type VendorFormValues = z.infer<typeof vendorFormSchema>;
export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

export const quickCreateVendorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a vendor name.")
    .max(120, "Name is too long."),
});
