import Link from "next/link";

import { TransactionsFiltersForm } from "@/components/transactions/transactions-filters-form";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageSection } from "@/components/ui/page-section";
import type { TransactionsPageData } from "@/lib/data/transactions-page";
import {
  buildTransactionsPageHref,
  hasActiveTransactionFilters,
} from "@/lib/transactions/page-url";

type TransactionsPageContentProps = {
  data: TransactionsPageData;
};

export function TransactionsPageContent({
  data,
}: TransactionsPageContentProps) {
  if (!data.canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Inventory activity"
          description="Browse receives, usage, transfers, adjustments, and count corrections."
        />
        <ErrorState
          title="Access denied"
          message={
            data.permissionMessage ??
            "Your account cannot view inventory activity."
          }
        />
      </div>
    );
  }

  const filtersActive = hasActiveTransactionFilters(data.filters);
  const showingFrom =
    data.totalCount === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const showingTo = Math.min(data.page * data.pageSize, data.totalCount);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory activity"
        description="Read-only history of receives, usage, transfers, adjustments, and physical count corrections."
      />

      <TransactionsFiltersForm
        filters={data.filters}
        itemOptions={data.itemOptions}
        locationOptions={data.locationOptions}
      />

      {data.loadError ? (
        <ErrorState
          title="Unable to load transactions"
          message={data.loadError}
        />
      ) : (
        <PageSection
          id="transactions-table-heading"
          title="Activity"
          action={
            data.totalCount > 0 ? (
              <span className="text-sm text-[var(--color-fg-muted)]">
                {showingFrom}–{showingTo} of {data.totalCount}
              </span>
            ) : null
          }
        >
          {data.transactions.length === 0 ? (
            <EmptyState
              title={
                filtersActive
                  ? "No transactions match your filters"
                  : "No transactions recorded yet"
              }
              description={
                filtersActive
                  ? "Try clearing filters or widening the date range, or clear filters to start over."
                  : "Receiving, usage, transfers, and adjustments will appear here once you record inventory activity."
              }
            />
          ) : (
            <>
              <TransactionsTable transactions={data.transactions} />

              {data.totalPages > 1 ? (
                <nav
                  aria-label="Transaction pagination"
                  className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-4"
                >
                  <span className="text-sm text-[var(--color-fg-muted)]">
                    Page {data.page} of {data.totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    {data.page > 1 ? (
                      <Link
                        href={buildTransactionsPageHref(
                          data.filters,
                          data.page - 1
                        )}
                        className="btn btn-secondary btn-sm"
                      >
                        Previous
                      </Link>
                    ) : (
                      <span className="btn btn-secondary btn-sm opacity-50 pointer-events-none">
                        Previous
                      </span>
                    )}
                    {data.page < data.totalPages ? (
                      <Link
                        href={buildTransactionsPageHref(
                          data.filters,
                          data.page + 1
                        )}
                        className="btn btn-secondary btn-sm"
                      >
                        Next
                      </Link>
                    ) : (
                      <span className="btn btn-secondary btn-sm opacity-50 pointer-events-none">
                        Next
                      </span>
                    )}
                  </div>
                </nav>
              ) : null}
            </>
          )}
        </PageSection>
      )}
    </div>
  );
}
