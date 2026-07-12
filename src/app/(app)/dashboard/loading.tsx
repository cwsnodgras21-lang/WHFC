import { PageHeader } from "@/components/ui/page-header";
import { SummaryStatsSkeleton } from "@/components/ui/summary-stats";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory overview"
        description="Stock levels, reorder needs, and recent activity across the clinic."
      />
      <SummaryStatsSkeleton />
      <div className="panel">
        <div className="panel-header">
          <div className="h-5 w-36 animate-pulse rounded bg-[var(--color-border-subtle)]" />
        </div>
        <div className="animate-pulse space-y-3 p-4">
          <div className="h-8 rounded bg-[var(--color-border-subtle)]" />
          <div className="h-8 rounded bg-[var(--color-border-subtle)]" />
          <div className="h-8 rounded bg-[var(--color-border-subtle)]" />
        </div>
      </div>
    </div>
  );
}
