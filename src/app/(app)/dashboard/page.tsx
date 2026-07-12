import { DashboardContent } from "@/components/dashboard/dashboard-content";
import {
  canConsumeInventory,
  canManagePhysicalCounts,
  canManagePurchaseOrderDrafts,
  canReceiveInventory,
} from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { getDashboardSummary } from "@/lib/data/dashboard";

export default async function DashboardPage() {
  const session = await requireSession();
  const summary = await getDashboardSummary();
  const { role, active } = session.profile;

  return (
    <DashboardContent
      summary={summary}
      canReceive={canReceiveInventory(role, active)}
      canDispense={canConsumeInventory(role, active)}
      canManagePoDrafts={canManagePurchaseOrderDrafts(role, active)}
      canManageCounts={canManagePhysicalCounts(role, active)}
    />
  );
}
