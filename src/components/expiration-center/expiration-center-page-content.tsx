import { ExpirationFiltersForm } from "@/components/expiration-center/expiration-filters-form";
import { ExpirationLotsTable } from "@/components/expiration-center/expiration-lots-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageSection } from "@/components/ui/page-section";
import { SummaryStats } from "@/components/ui/summary-stats";
import { EXPIRATION_BUCKET_LABELS } from "@/lib/lots/expiration";
import type { ExpirationCenterData } from "@/lib/data/expiration-center-page";

type ExpirationCenterPageContentProps = {
  data: ExpirationCenterData;
};

export function ExpirationCenterPageContent({
  data,
}: ExpirationCenterPageContentProps) {
  if (!data.canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Expiration center"
          description="Track expiring and expired stock across the clinic."
        />
        <ErrorState
          title="Access denied"
          message={
            data.permissionMessage ??
            "Your account cannot view the expiration center."
          }
        />
      </div>
    );
  }

  const hasRows = data.rows.length > 0;
  const bucketLabel = EXPIRATION_BUCKET_LABELS[data.filters.bucket];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expiration center"
        description="Find expiring and expired stock, then dispose, adjust, or reorder it."
      />

      <SummaryStats
        aria-label="Expiration summary"
        stats={[
          {
            label: "Expired",
            value: data.summary.expired,
            hint: "Past expiration date",
            tone: data.summary.expired > 0 ? "attention" : "success",
          },
          {
            label: "Expiring in 30 days",
            value: data.summary.expiring30,
            hint: "Use or replace soon",
            tone: data.summary.expiring30 > 0 ? "attention" : "success",
          },
          {
            label: "Expiring in 60 days",
            value: data.summary.expiring60,
            hint: "Coming up",
          },
          {
            label: "Expiring in 90 days",
            value: data.summary.expiring90,
            hint: "On the horizon",
          },
        ]}
      />

      <ExpirationFiltersForm
        filters={data.filters}
        categories={data.categories}
        items={data.items}
        locations={data.locations}
      />

      {data.loadError ? (
        <ErrorState
          title="Unable to load expiration data"
          message={data.loadError}
        />
      ) : (
        <PageSection
          id="expiration-table-heading"
          title={bucketLabel}
          action={
            hasRows ? (
              <span className="text-sm text-[var(--color-fg-muted)]">
                {data.rows.length} lot{data.rows.length === 1 ? "" : "s"}
              </span>
            ) : null
          }
        >
          {!hasRows ? (
            <EmptyState
              title="Nothing here"
              description="No lots match this view. Try a wider window or clear the filters."
            />
          ) : (
            <ExpirationLotsTable
              rows={data.rows}
              canDispose={data.canDispose}
              canAdjust={data.canAdjust}
            />
          )}
        </PageSection>
      )}
    </div>
  );
}
