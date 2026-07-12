import { TransferInventoryForm } from "@/components/inventory/transfer-inventory-form";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import type { TransferPageData } from "@/lib/data/transfer";

type TransferPageContentProps = {
  data: TransferPageData;
};

export function TransferPageContent({ data }: TransferPageContentProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Transfer stock"
        description="Move stock from one storage area to another."
      />

      {!data.canTransfer ? (
        <EmptyState
          title="Permission denied"
          description={
            data.permissionMessage ??
            "Your account cannot transfer inventory."
          }
        />
      ) : (
        <>
          {data.loadError ? (
            <ErrorState
              title="Some transfer data could not be loaded"
              message={data.loadError}
            />
          ) : null}

          <TransferInventoryForm
            items={data.items}
            locations={data.locations}
            onHandByKey={data.onHandByKey}
            recentTransfers={data.recentTransfers}
          />
        </>
      )}
    </div>
  );
}
