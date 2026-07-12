import { ReceiveInventoryForm } from "@/components/inventory/receive-inventory-form";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import type { ReceivePageData } from "@/lib/data/receive";

type ReceivePageContentProps = {
  data: ReceivePageData;
};

export function ReceivePageContent({ data }: ReceivePageContentProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Receive stock"
        description="Record a delivery — pick the item, location, and quantity received."
      />

      {!data.canReceive ? (
        <EmptyState
          title="Permission denied"
          description={
            data.permissionMessage ??
            "Your account cannot receive inventory."
          }
        />
      ) : (
        <>
          {data.loadError ? (
            <ErrorState
              title="Some receive data could not be loaded"
              message={data.loadError}
            />
          ) : null}

          <ReceiveInventoryForm
            items={data.items}
            locations={data.locations}
            vendors={data.vendors}
            onHandByKey={data.onHandByKey}
            recentReceipts={data.recentReceipts}
            expirationTrackingEnabled={data.expirationTrackingEnabled}
            lotTrackingEnabled={data.lotTrackingEnabled}
          />
        </>
      )}
    </div>
  );
}
