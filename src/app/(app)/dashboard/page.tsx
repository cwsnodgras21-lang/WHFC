import { DashboardContent } from "@/components/dashboard/dashboard-content";
import {
  canConsumeInventory,
  canManagePhysicalCounts,
  canManagePurchaseOrderDrafts,
  canReceiveInventory,
} from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { getDashboardSummary } from "@/lib/data/dashboard";
import { getRecentActivity } from "@/lib/data/activity-feed";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const [summary, recentActivity] = await Promise.all([
    getDashboardSummary(),
    getRecentActivity(supabase, session),
  ]);
  const { role, active } = session.profile;

  return (
    <DashboardContent
      summary={summary}
      recentActivity={recentActivity.items}
      recentActivityError={recentActivity.loadError}
      canReceive={canReceiveInventory(role, active)}
      canDispense={canConsumeInventory(role, active)}
      canManagePoDrafts={canManagePurchaseOrderDrafts(role, active)}
      canManageCounts={canManagePhysicalCounts(role, active)}
    />
  );
}
