import type { SupabaseClient } from "@supabase/supabase-js";

import { isModuleEnabled } from "@/lib/modules/definitions";
import { getOrganizationModules } from "@/lib/modules/fetch";
import type { OrganizationModules } from "@/lib/modules/types";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type GettingStartedStepId =
  | "items"
  | "vendors"
  | "receive"
  | "expirations"
  | "reorder";

export type GettingStartedStep = {
  id: GettingStartedStepId;
  label: string;
  description: string;
  href: string;
  complete: boolean;
  applicable: boolean;
};

export type GettingStartedProgress = {
  steps: GettingStartedStep[];
  completedCount: number;
  applicableCount: number;
  isComplete: boolean;
};

export async function getGettingStartedProgress(
  supabase: Client,
  modules: OrganizationModules
): Promise<GettingStartedProgress> {
  const [
    itemsResult,
    vendorsResult,
    locationsResult,
    receiveResult,
    expirationLotsResult,
  ] = await Promise.all([
    supabase.from("items").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("vendors").select("id", { count: "exact", head: true }).eq("active", true),
    supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("inventory_transaction_history")
      .select("id", { count: "exact", head: true })
      .eq("transaction_type", "RECEIVE")
      .limit(1),
    isModuleEnabled(modules, "expiration_tracking")
      ? supabase
          .from("inventory_lot_stock")
          .select("lot_id", { count: "exact", head: true })
          .gt("quantity_on_hand", 0)
          .not("expiration_date", "is", null)
      : Promise.resolve({ count: 0, error: null }),
  ]);

  const hasItems = (itemsResult.count ?? 0) > 0;
  const hasVendors = (vendorsResult.count ?? 0) > 0;
  const hasLocations = (locationsResult.count ?? 0) > 0;
  const hasReceived = (receiveResult.count ?? 0) > 0;
  const hasExpirationLots = (expirationLotsResult.count ?? 0) > 0;

  const expirationApplicable = isModuleEnabled(modules, "expiration_tracking");
  const reorderApplicable = isModuleEnabled(modules, "reorder_suggestions");

  const steps: GettingStartedStep[] = [
    {
      id: "items",
      label: "Add items",
      description: "Build your supply catalog with names, units, and stocking levels.",
      href: "/items",
      complete: hasItems,
      applicable: true,
    },
    {
      id: "vendors",
      label: "Add vendors",
      description: "List suppliers you order from so items can link to a preferred vendor.",
      href: "/administration/vendors",
      complete: hasVendors,
      applicable: true,
    },
    {
      id: "receive",
      label: "Receive inventory",
      description: "Record your first delivery to put stock on hand.",
      href: "/receive",
      complete: hasReceived,
      applicable: hasItems && hasLocations,
    },
    {
      id: "expirations",
      label: "Review expirations",
      description: "Check dated stock after your first receipts with expiration dates.",
      href: "/expiration",
      complete: hasExpirationLots,
      applicable: expirationApplicable && hasReceived,
    },
    {
      id: "reorder",
      label: "Review reorder suggestions",
      description: "See what to buy next based on stock levels and recent usage.",
      href: "/reorder-suggestions",
      complete: hasReceived,
      applicable: reorderApplicable && hasReceived,
    },
  ];

  const applicableSteps = steps.filter((step) => step.applicable);
  const completedCount = applicableSteps.filter((step) => step.complete).length;

  return {
    steps,
    completedCount,
    applicableCount: applicableSteps.length,
    isComplete:
      applicableSteps.length > 0 && completedCount === applicableSteps.length,
  };
}

export async function loadGettingStartedProgress(
  supabase: Client
): Promise<GettingStartedProgress> {
  const modules = await getOrganizationModules();
  return getGettingStartedProgress(supabase, modules);
}
