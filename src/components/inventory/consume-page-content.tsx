import { ConsumeInventoryForm } from "@/components/inventory/consume-inventory-form";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import type { ConsumePageData } from "@/lib/data/consume";

type ConsumePageContentProps = {
  data: ConsumePageData;
};

export function ConsumePageContent({ data }: ConsumePageContentProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Use stock"
        description="Record supplies used in the clinic — pick the item, location, and quantity."
      />

      {!data.canConsume ? (
        <EmptyState
          title="Permission denied"
          description={
            data.permissionMessage ??
            "Your account cannot consume inventory."
          }
        />
      ) : (
        <>
          {data.loadError ? (
            <ErrorState
              title="Some consume data could not be loaded"
              message={data.loadError}
            />
          ) : null}

          <ConsumeInventoryForm
            items={data.items}
            locations={data.locations}
            lots={data.lots}
            onHandByKey={data.onHandByKey}
            recentConsumptions={data.recentConsumptions}
            lotTrackingEnabled={data.lotTrackingEnabled}
          />
        </>
      )}
    </div>
  );
}
