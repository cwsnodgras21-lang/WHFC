import { PageHeader } from "@/components/ui/page-header";

function SkeletonBar({ className = "h-11" }: { className?: string }) {
  return <div className={`${className} rounded bg-[var(--color-border-subtle)]`} />;
}

export default function ConsumeLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Use stock"
        description="Record supplies used in the clinic — pick the item, location, and quantity."
      />
      <div className="form-section animate-pulse">
        <div className="h-5 w-40 rounded bg-[var(--color-border-subtle)]" />
        <SkeletonBar />
        <SkeletonBar />
      </div>
      <div className="form-section animate-pulse">
        <div className="h-5 w-32 rounded bg-[var(--color-border-subtle)]" />
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonBar />
          <SkeletonBar />
        </div>
        <SkeletonBar />
      </div>
      <div className="flex justify-end">
        <SkeletonBar className="h-11 w-40" />
      </div>
    </div>
  );
}
