import { VendorsCatalog } from "@/components/vendors/vendors-catalog";
import { HelpButton } from "@/components/help/help-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import type { VendorsPageData } from "@/lib/data/vendors-page";

export function VendorsPageContent({ data }: { data: VendorsPageData }) {
  return (
    <>
      <PageHeader
        title="Vendors"
        description="Manage preferred vendors for catalog items."
        actions={<HelpButton topic="vendors" />}
      />
      {!data.canView ? <EmptyState title="Permission denied" description={data.permissionMessage ?? "Access denied."} /> : (
        <>
          {!data.canManage ? <EmptyState title="View only" description="Only administrators and inventory managers can edit vendors." /> : null}
          {data.loadError ? <ErrorState title="Could not load vendors" message={data.loadError} /> : null}
          <VendorsCatalog vendors={data.vendors} canManage={data.canManage} />
        </>
      )}
    </>
  );
}
