import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppSession } from "@/lib/auth/session";
import type {
  ActivityModule,
  ActivitySeverity,
} from "@/lib/activity/service";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type ActivityFeedItem = {
  id: string;
  module: ActivityModule;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  title: string;
  description: string | null;
  severity: ActivitySeverity;
  actorName: string | null;
  occurredAt: string;
};

/** Modules a user can filter Recent Activity by (plus the implicit "all"). */
export const ACTIVITY_FILTER_MODULES = [
  "inventory",
  "imaging",
  "purchasing",
  "expiration",
  "vendors",
] as const satisfies readonly ActivityModule[];

export const ACTIVITY_MODULE_LABELS: Record<ActivityModule, string> = {
  inventory: "Inventory",
  expiration: "Expiration",
  vendors: "Vendors",
  purchasing: "Purchasing",
  imaging: "Imaging",
  counts: "Counts",
  system: "System",
};

export type RecentActivityResult = {
  items: ActivityFeedItem[];
  loadError: string | null;
};

const DEFAULT_LIMIT = 30;

/**
 * Reads the most recent operational events from the platform activity feed.
 * The feed is populated by any module through the Activity Service, so this
 * reader — and the component that renders it — never change as modules grow.
 */
export async function getRecentActivity(
  supabase: Client,
  session: AppSession,
  options: { module?: ActivityModule; limit?: number } = {}
): Promise<RecentActivityResult> {
  if (!session.profile.active) {
    return { items: [], loadError: null };
  }

  const limit = options.limit ?? DEFAULT_LIMIT;
  let query = supabase
    .from("activity_feed")
    .select(
      "id, module, event_type, entity_type, entity_id, title, description, severity, actor_name, occurred_at"
    )
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (options.module) {
    query = query.eq("module", options.module);
  }

  const { data, error } = await query;

  if (error) {
    return { items: [], loadError: error.message };
  }

  const items: ActivityFeedItem[] = (data ?? [])
    .filter((row) => row.id !== null && row.module !== null)
    .map((row) => ({
      id: row.id as string,
      module: row.module as ActivityModule,
      eventType: row.event_type ?? "",
      entityType: row.entity_type,
      entityId: row.entity_id,
      title: row.title ?? "",
      description: row.description,
      severity: (row.severity ?? "info") as ActivitySeverity,
      actorName: row.actor_name,
      occurredAt: row.occurred_at ?? new Date(0).toISOString(),
    }));

  return { items, loadError: null };
}
