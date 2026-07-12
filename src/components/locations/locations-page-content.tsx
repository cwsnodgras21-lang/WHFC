import { LocationsCatalog } from "@/components/locations/locations-catalog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import type { LocationsPageData } from "@/lib/data/locations-page";

export function LocationsPageContent({
  data,
}: {
  data: LocationsPageData;
}) {
  return (
    <>
      <PageHeader
        title="Locations"
        description="Manage internal storage locations such as rooms, cabinets, shelves, and bins."
      />
      {!data.canView ? (
        <EmptyState
          title="Permission denied"
          description={data.permissionMessage ?? "Access denied."}
        />
      ) : (
        <>
          {!data.canManage ? (
            <EmptyState
              title="View only"
              description="Only administrators and inventory managers can create or edit locations."
            />
          ) : null}
          {data.loadError ? (
            <ErrorState
              title="Could not load locations"
              message={data.loadError}
            />
          ) : null}
          <LocationsCatalog
            locations={data.locations}
            canManage={data.canManage}
          />
        </>
      )}
    </>
  );
}
