import type { SupabaseClient } from "@supabase/supabase-js";

import {
  canManageReorderSuggestions,
  canViewReorderSuggestions,
} from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { computeReorderSuggestions } from "@/lib/reorder-suggestions/fetch-inputs";
import type { ReorderSuggestion } from "@/lib/reorder-suggestions/calculate";
import { isModuleEnabled } from "@/lib/modules/definitions";
import { getOrganizationModules } from "@/lib/modules/fetch";
import type { OrganizationModules } from "@/lib/modules/types";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type ReorderSuggestionsPageData = {
  canView: boolean;
  canManage: boolean;
  permissionMessage: string | null;
  suggestions: ReorderSuggestion[];
  draftCount: number;
  generatedAt: string;
  enabledModules: OrganizationModules;
  loadError: string | null;
};

export async function getReorderSuggestionsPageData(
  supabase: Client,
  session: AppSession
): Promise<ReorderSuggestionsPageData> {
  const canView = canViewReorderSuggestions(session.profile.active);
  const canManage = canManageReorderSuggestions(
    session.profile.role,
    session.profile.active
  );

  if (!canView) {
    return {
      canView: false,
      canManage: false,
      permissionMessage: "Your account cannot view reorder suggestions.",
      suggestions: [],
      draftCount: 0,
      generatedAt: new Date().toISOString(),
      enabledModules: await getOrganizationModules(),
      loadError: null,
    };
  }

  try {
    const now = new Date();
    const enabledModules = await getOrganizationModules();
    const poDraftsEnabled = isModuleEnabled(enabledModules, "po_drafts");

    const [suggestions, draftsResult] = await Promise.all([
      computeReorderSuggestions(supabase, now),
      poDraftsEnabled
        ? supabase
            .from("purchase_order_drafts")
            .select("id", { count: "exact", head: true })
            .eq("status", "draft")
        : Promise.resolve({ count: 0, error: null }),
    ]);

    if (draftsResult.error) {
      throw new Error(draftsResult.error.message);
    }

    return {
      canView: true,
      canManage,
      permissionMessage: null,
      suggestions,
      draftCount: draftsResult.count ?? 0,
      generatedAt: now.toISOString(),
      enabledModules,
      loadError: null,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load reorder suggestions.";

    return {
      canView: true,
      canManage,
      permissionMessage: null,
      suggestions: [],
      draftCount: 0,
      generatedAt: new Date().toISOString(),
      enabledModules: await getOrganizationModules(),
      loadError: message,
    };
  }
}
