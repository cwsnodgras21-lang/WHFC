import { PurchaseOrderDraftDetailContent } from "@/components/purchase-order-drafts/purchase-order-draft-detail-content";
import { requireSession } from "@/lib/auth/session";
import { getPurchaseOrderDraftDetailData } from "@/lib/data/purchase-order-draft-detail";
import { ModulePageGuard } from "@/lib/modules/guard";
import { createClient } from "@/lib/supabase/server";

type PurchaseOrderDraftDetailPageProps = {
  params: Promise<{ draftId: string }>;
};

export default async function PurchaseOrderDraftDetailPage({
  params,
}: PurchaseOrderDraftDetailPageProps) {
  const { draftId } = await params;
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getPurchaseOrderDraftDetailData(supabase, session, draftId);

  return (
    <ModulePageGuard moduleKey="po_drafts">
      <PurchaseOrderDraftDetailContent data={data} />
    </ModulePageGuard>
  );
}
