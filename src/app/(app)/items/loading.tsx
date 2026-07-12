import { PageHeader } from "@/components/ui/page-header";

export default function ItemsLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Items"
        description="Manage consumable catalog items, SKUs, and reorder settings."
      />
      <div className="card animate-pulse card-body space-y-4">
        <div className="flex justify-between gap-4">
          <div className="h-10 flex-1 rounded bg-[var(--color-border-subtle)]" />
          <div className="h-10 w-32 rounded bg-[var(--color-border-subtle)]" />
        </div>
        <div className="h-10 rounded bg-[var(--color-border-subtle)]" />
        <div className="h-8 rounded bg-[var(--color-border-subtle)]" />
        <div className="h-8 rounded bg-[var(--color-border-subtle)]" />
        <div className="h-8 rounded bg-[var(--color-border-subtle)]" />
      </div>
    </div>
  );
}
