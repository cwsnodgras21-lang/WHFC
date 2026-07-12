import { UnitsCatalog } from "@/components/units/units-catalog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import type { UnitsPageData } from "@/lib/data/units-page";

export function UnitsPageContent({ data }: { data: UnitsPageData }) {
  return (
    <>
      <PageHeader title="Units of Measure" description="Define stocking units used by catalog items." />
      {!data.canView ? <EmptyState title="Permission denied" description={data.permissionMessage ?? "Access denied."} /> : (
        <>
          {data.permissionMessage ? <EmptyState title="View only" description={data.permissionMessage} /> : null}
          {data.loadError ? <ErrorState title="Could not load units" message={data.loadError} /> : null}
          <UnitsCatalog units={data.units} canManage={data.canManage} />
        </>
      )}
    </>
  );
}
