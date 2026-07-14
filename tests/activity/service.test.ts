import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { publishActivity } from "@/lib/activity/service";
import { ACTIVITY_EVENTS } from "@/lib/activity/events";
import type { Database } from "@/lib/types/database";

function mockSupabase(rpcResult: { data: unknown; error: { message: string } | null }) {
  return {
    rpc: vi.fn().mockResolvedValue(rpcResult),
  } as unknown as SupabaseClient<Database>;
}

describe("publishActivity", () => {
  it("forwards the payload to the record_activity RPC and stamps defaults", async () => {
    const supabase = mockSupabase({ data: "evt-1", error: null });

    await publishActivity(supabase, {
      module: "imaging",
      eventType: ACTIVITY_EVENTS.imaging.scheduled,
      title: "MRI scheduled",
      entityId: "order-1",
      entityType: "imaging_order",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("record_activity", {
      p_module: "imaging",
      p_event_type: "imaging.scheduled",
      p_title: "MRI scheduled",
      p_entity_type: "imaging_order",
      p_entity_id: "order-1",
      p_description: null,
      p_severity: "info",
      p_metadata: null,
    });
  });

  it("never throws when the RPC returns an error", async () => {
    const supabase = mockSupabase({ data: null, error: { message: "boom" } });

    await expect(
      publishActivity(supabase, {
        module: "inventory",
        eventType: ACTIVITY_EVENTS.inventory.received,
        title: "Received stock",
      })
    ).resolves.toBeUndefined();
  });

  it("never throws when the client has no rpc method", async () => {
    const brokenClient = {} as unknown as SupabaseClient<Database>;

    await expect(
      publishActivity(brokenClient, {
        module: "vendors",
        eventType: ACTIVITY_EVENTS.vendors.created,
        title: "Added vendor",
      })
    ).resolves.toBeUndefined();
  });
});
