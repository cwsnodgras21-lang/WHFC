import { PageHeader } from "@/components/ui/page-header";

export default function PhysicalCountsLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Physical counts"
        description="Reconcile on-hand stock at a location by counting every active item."
      />
      <div className="card animate-pulse card-body space-y-4">
        <div className="h-10 rounded bg-[var(--color-border-subtle)]" />
        <div className="flex justify-end">
          <div className="h-10 w-28 rounded bg-[var(--color-border-subtle)]" />
        </div>
      </div>
      <div className="card animate-pulse card-body space-y-3">
        <div className="h-4 w-32 rounded bg-[var(--color-border-subtle)]" />
        <div className="h-8 rounded bg-[var(--color-border-subtle)]" />
        <div className="h-8 rounded bg-[var(--color-border-subtle)]" />
      </div>
    </div>
  );
}
