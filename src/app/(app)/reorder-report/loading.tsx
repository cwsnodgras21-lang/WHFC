import { PageHeader } from "@/components/ui/page-header";
import { SummaryStatsSkeleton } from "@/components/ui/summary-stats";

export default function ReorderReportLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reorder report"
        description="Review active items at or below reorder point and suggested replenishment quantities."
      />
      <SummaryStatsSkeleton />
      <div className="card animate-pulse card-body space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-10 rounded bg-[var(--color-border-subtle)]"
            />
          ))}
        </div>
      </div>
      <div className="card animate-pulse card-body space-y-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-8 rounded bg-[var(--color-border-subtle)]"
          />
        ))}
      </div>
    </div>
  );
}
