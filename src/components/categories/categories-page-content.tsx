import { CategoriesCatalog } from "@/components/categories/categories-catalog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import type { CategoriesPageData } from "@/lib/data/categories-page";

export function CategoriesPageContent({ data }: { data: CategoriesPageData }) {
  return (
    <>
      <PageHeader title="Categories" description="Manage item categories used in the catalog." />
      {!data.canView ? (
        <EmptyState title="Permission denied" description={data.permissionMessage ?? "Access denied."} />
      ) : (
        <>
          {!data.canManage ? (
            <EmptyState title="View only" description="Only administrators and inventory managers can edit categories." />
          ) : null}
          {data.loadError ? <ErrorState title="Could not load categories" message={data.loadError} /> : null}
          <CategoriesCatalog categories={data.categories} canManage={data.canManage} />
        </>
      )}
    </>
  );
}
