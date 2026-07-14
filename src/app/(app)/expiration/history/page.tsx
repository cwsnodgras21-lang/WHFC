import { ExpirationHistoryPageContent } from "@/components/expiration-center/expiration-history-page-content";
import { getRecentActivity } from "@/lib/data/activity-feed";
import { requireSession } from "@/lib/auth/session";
import { ModulePageGuard } from "@/lib/modules/guard";
import { createClient } from "@/lib/supabase/server";

export default async function ExpirationHistoryPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const activity = await getRecentActivity(supabase, session, {
    module: "expiration",
    limit: 100,
  });

  return (
    <ModulePageGuard moduleKey="expiration_tracking">
      <ExpirationHistoryPageContent
        items={activity.items}
        loadError={activity.loadError}
        canView={session.profile.active}
        permissionMessage={
          session.profile.active
            ? null
            : "Your account cannot view expiration history."
        }
      />
    </ModulePageGuard>
  );
}
