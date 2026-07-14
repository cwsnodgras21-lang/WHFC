import { ItemsCatalog } from "@/components/items/items-catalog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import type { ItemsPageData } from "@/lib/data/items-page";
import type { ActiveStatusFilter } from "@/lib/validation/catalog-filters";

type ItemsPageContentProps = {
  data: ItemsPageData;
  initialStatusFilter?: ActiveStatusFilter;
};

export function ItemsPageContent({
  data,
  initialStatusFilter = "all",
}: ItemsPageContentProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Items"
        description="Manage your supply catalog, product codes, and minimum stocking levels."
      />

      {!data.canView ? (
        <EmptyState
          title="Permission denied"
          description={
            data.permissionMessage ??
            "Your account cannot view the item catalog."
          }
        />
      ) : (
        <>
          {!data.canManage ? (
            <p className="text-sm text-muted">
              You can browse the catalog. Administrators and inventory managers
              can add or edit items.
            </p>
          ) : null}

          {data.loadError ? (
            <ErrorState
              title="Some item data could not be loaded"
              message={data.loadError}
            />
          ) : null}

          <ItemsCatalog
            items={data.items}
            referenceData={data.referenceData}
            canManage={data.canManage}
            initialStatusFilter={initialStatusFilter}
          />
        </>
      )}
    </div>
  );
}
