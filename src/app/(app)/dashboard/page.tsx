import { DashboardContent } from "@/components/dashboard/dashboard-content";
import {
  canManagePhysicalCounts,
  canManagePurchaseOrderDrafts,
} from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { getDashboardSummary } from "@/lib/data/dashboard";
import { getRecentActivity } from "@/lib/data/activity-feed";
import { getImagingHighlights } from "@/lib/data/imaging-page";
import { isModuleEnabled } from "@/lib/modules/definitions";
import { getOrganizationModules } from "@/lib/modules/fetch";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const modules = await getOrganizationModules();

  const [summary, recentActivity, imaging] = await Promise.all([
    getDashboardSummary(),
    getRecentActivity(supabase, session),
    isModuleEnabled(modules, "imaging_log")
      ? getImagingHighlights(supabase, session)
      : Promise.resolve(null),
  ]);
  const { role, active } = session.profile;

  return (
    <DashboardContent
      summary={summary}
      recentActivity={recentActivity.items}
      recentActivityError={recentActivity.loadError}
      imaging={imaging}
      canManagePoDrafts={canManagePurchaseOrderDrafts(role, active)}
      canManageCounts={canManagePhysicalCounts(role, active)}
    />
  );
}
