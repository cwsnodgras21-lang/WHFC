import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type ActivityModule = Database["public"]["Enums"]["activity_module"];
export type ActivitySeverity = Database["public"]["Enums"]["activity_severity"];

export type PublishActivityInput = {
  module: ActivityModule;
  /** Namespaced event type — see ACTIVITY_EVENTS. */
  eventType: string;
  /** One-line human-readable headline for the feed. */
  title: string;
  entityType?: string | null;
  entityId?: string | null;
  description?: string | null;
  severity?: ActivitySeverity;
  metadata?: Json;
};

/**
 * The platform Activity Service.
 *
 * Every module publishes operational events here instead of writing to any
 * timeline component directly. Publishing goes through the SECURITY DEFINER
 * `record_activity` RPC, which stamps the acting user server-side.
 *
 * This is intentionally fire-and-forget: a failure to record activity must
 * never roll back or fail the underlying business operation. Errors are logged
 * and swallowed. Callers should `await` it (so it runs before the response is
 * sent) but never need to handle its result.
 */
export async function publishActivity(
  supabase: Client,
  input: PublishActivityInput
): Promise<void> {
  try {
    const { error } = await supabase.rpc("record_activity", {
      p_module: input.module,
      p_event_type: input.eventType,
      p_title: input.title,
      p_entity_type: input.entityType ?? null,
      p_entity_id: input.entityId ?? null,
      p_description: input.description ?? null,
      p_severity: input.severity ?? "info",
      p_metadata: input.metadata ?? null,
    });

    if (error) {
      console.error(
        `[activity] failed to publish "${input.eventType}": ${error.message}`
      );
    }
  } catch (cause) {
    console.error(
      `[activity] failed to publish "${input.eventType}"`,
      cause
    );
  }
}
