import { PageHeader } from "@/components/ui/page-header";

export default function PhysicalCountDetailLoading() {
  return (
    <div className="space-y-6">
      <PageHeader title="Physical count" description="Loading count session…" />
      <div className="card animate-pulse card-body space-y-3">
        <div className="h-8 rounded bg-[var(--color-border-subtle)]" />
        <div className="h-8 rounded bg-[var(--color-border-subtle)]" />
        <div className="h-8 rounded bg-[var(--color-border-subtle)]" />
      </div>
    </div>
  );
}
