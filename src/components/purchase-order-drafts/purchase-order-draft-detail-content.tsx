import {
  PurchaseOrderDraftDetailHeader,
  PurchaseOrderDraftLinesForm,
} from "@/components/purchase-order-drafts/purchase-order-draft-lines-form";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import type { PurchaseOrderDraftDetailData } from "@/lib/data/purchase-order-draft-detail";

type PurchaseOrderDraftDetailContentProps = {
  data: PurchaseOrderDraftDetailData;
};

export function PurchaseOrderDraftDetailContent({
  data,
}: PurchaseOrderDraftDetailContentProps) {
  if (!data.canView) {
    return (
      <EmptyState
        title="Permission denied"
        description={
          data.permissionMessage ??
          "Your account cannot view purchase order drafts."
        }
      />
    );
  }

  if (!data.draft) {
    return (
      <EmptyState
        title="Purchase order draft not found"
        description="This draft may have been removed or you do not have access."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PurchaseOrderDraftDetailHeader draft={data.draft} />

      {data.loadError ? (
        <ErrorState
          title="Some draft data could not be loaded"
          message={data.loadError}
        />
      ) : null}

      {data.lines.length === 0 ? (
        <EmptyState
          title="No lines on this draft"
          description="This draft has no remaining line items."
        />
      ) : (
        <PurchaseOrderDraftLinesForm
          key={`${data.draft.id}-${data.draft.status}-${data.lines.length}`}
          draft={data.draft}
          initialLines={data.lines}
          canManage={data.canManage}
        />
      )}
    </div>
  );
}
