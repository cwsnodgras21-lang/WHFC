import { PurchaseOrderDraftsPageContent } from "@/components/purchase-order-drafts/purchase-order-drafts-page-content";
import { requireSession } from "@/lib/auth/session";
import { getPurchaseOrderDraftsPageData } from "@/lib/data/purchase-order-drafts-page";
import { ModulePageGuard } from "@/lib/modules/guard";
import { createClient } from "@/lib/supabase/server";

export default async function PurchaseOrderDraftsPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getPurchaseOrderDraftsPageData(supabase, session);

  return (
    <ModulePageGuard moduleKey="po_drafts">
      <PurchaseOrderDraftsPageContent data={data} />
    </ModulePageGuard>
  );
}
