import { PageHeader } from "@/components/ui/page-header";

export default function LocationsLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations"
        description="Manage internal storage locations such as rooms, cabinets, shelves, and bins."
      />
      <div className="card animate-pulse card-body space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <div className="h-4 w-48 rounded bg-[var(--color-border-subtle)]" />
            <div className="h-10 rounded bg-[var(--color-border-subtle)]" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 rounded bg-[var(--color-border-subtle)]" />
            <div className="h-10 w-40 rounded bg-[var(--color-border-subtle)]" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-12 rounded bg-[var(--color-border-subtle)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
