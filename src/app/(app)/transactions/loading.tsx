import { PageHeader } from "@/components/ui/page-header";

export default function TransactionsLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory activity"
        description="Read-only history of receives, usage, transfers, adjustments, and physical count corrections."
      />
      <div className="card animate-pulse card-body space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-10 rounded bg-[var(--color-border-subtle)]"
            />
          ))}
        </div>
        <div className="h-10 w-32 rounded bg-[var(--color-border-subtle)]" />
      </div>
      <div className="card animate-pulse card-body space-y-3">
        <div className="h-4 w-40 rounded bg-[var(--color-border-subtle)]" />
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
