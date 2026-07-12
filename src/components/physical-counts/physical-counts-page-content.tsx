import { CountHistoryTable } from "@/components/physical-counts/count-history-table";
import { StartCountForm } from "@/components/physical-counts/start-count-form";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageSection } from "@/components/ui/page-section";
import type { PhysicalCountsPageData } from "@/lib/data/physical-counts";

type PhysicalCountsPageContentProps = {
  data: PhysicalCountsPageData;
};

export function PhysicalCountsPageContent({
  data,
}: PhysicalCountsPageContentProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Physical counts"
        description="Count everything at a location, then update quantities to match what you found."
      />

      {!data.canManage ? (
        <EmptyState
          title="Permission denied"
          description={
            data.permissionMessage ??
            "Your account cannot manage physical counts."
          }
        />
      ) : (
        <>
          {data.loadError ? (
            <ErrorState
              title="Some physical count data could not be loaded"
              message={data.loadError}
            />
          ) : null}

          <StartCountForm locations={data.locations} />

          <PageSection id="count-history-heading" title="Count history">
            <CountHistoryTable counts={data.counts} />
          </PageSection>
        </>
      )}
    </div>
  );
}
