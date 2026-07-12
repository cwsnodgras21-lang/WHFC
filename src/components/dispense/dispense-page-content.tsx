import { DispenseKitForm } from "@/components/dispense/dispense-kit-form";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import type { DispensePageData } from "@/lib/data/dispense";

type DispensePageContentProps = {
  data: DispensePageData;
};

export function DispensePageContent({ data }: DispensePageContentProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispense kit"
        description="Decrement inventory for a configured procedure kit in one step."
      />

      {!data.canDispense ? (
        <EmptyState
          title="Permission denied"
          description={
            data.permissionMessage ??
            "Your account cannot dispense procedure kits."
          }
        />
      ) : (
        <>
          {data.loadError ? (
            <ErrorState
              title="Some dispense data could not be loaded"
              message={data.loadError}
            />
          ) : null}

          <DispenseKitForm
            kits={data.kits}
            locations={data.locations}
            onHandByKey={data.onHandByKey}
            lots={data.lots}
          />
        </>
      )}
    </div>
  );
}
