import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageVendors } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import {
  createVendorSchema,
  quickCreateVendorSchema,
  updateVendorSchema,
  type CreateVendorInput,
  type UpdateVendorInput,
} from "@/lib/validation/vendor";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type VendorMutationSuccess = {
  success: true;
  vendorId: string;
};

export type VendorMutationFailure = {
  success: false;
  error: string;
};

export type VendorMutationResult = VendorMutationSuccess | VendorMutationFailure;

function mapDbError(message: string): string {
  if (
    message.includes("duplicate key") ||
    message.includes("vendors_name_active_unique") ||
    message.includes("23505")
  ) {
    return "A vendor with this name already exists.";
  }
  if (message.includes("permission denied") || message.includes("42501")) {
    return "You do not have permission to manage vendors.";
  }
  return message;
}

export async function executeCreateVendor(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<VendorMutationResult> {
  if (!canManageVendors(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage vendors.",
    };
  }

  const parsed = createVendorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
    };
  }

  return insertVendor(supabase, parsed.data);
}

export async function executeQuickCreateVendor(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<VendorMutationResult> {
  if (!canManageVendors(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage vendors.",
    };
  }

  const parsed = quickCreateVendorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
    };
  }

  return insertVendor(supabase, {
    name: parsed.data.name,
    contactEmail: null,
    contactPhone: null,
    active: true,
  });
}

export async function executeUpdateVendor(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<VendorMutationResult> {
  if (!canManageVendors(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage vendors.",
    };
  }

  const parsed = updateVendorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
    };
  }

  return updateVendorRecord(supabase, parsed.data);
}

export async function executeSetVendorActive(
  supabase: Client,
  session: AppSession,
  vendorId: string,
  active: boolean
): Promise<VendorMutationResult> {
  if (!canManageVendors(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage vendors.",
    };
  }

  const { data, error } = await supabase
    .from("vendors")
    .update({ active })
    .eq("id", vendorId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  if (!data) {
    return { success: false, error: "Vendor not found." };
  }

  return { success: true, vendorId: data.id };
}

export async function insertVendor(
  supabase: Client,
  input: CreateVendorInput
): Promise<VendorMutationResult> {
  const { data, error } = await supabase
    .from("vendors")
    .insert({
      name: input.name,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
      active: input.active,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  return { success: true, vendorId: data.id };
}

export async function updateVendorRecord(
  supabase: Client,
  input: UpdateVendorInput
): Promise<VendorMutationResult> {
  const { data, error } = await supabase
    .from("vendors")
    .update({
      name: input.name,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
      active: input.active,
    })
    .eq("id", input.id)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  return { success: true, vendorId: data.id };
}
