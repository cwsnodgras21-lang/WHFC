import {
  CountLinesForm,
  PhysicalCountDetailHeader,
} from "@/components/physical-counts/count-lines-form";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import type { PhysicalCountDetailData } from "@/lib/data/physical-counts";

type PhysicalCountDetailContentProps = {
  data: PhysicalCountDetailData;
};

export function PhysicalCountDetailContent({
  data,
}: PhysicalCountDetailContentProps) {
  if (!data.canManage) {
    return (
      <EmptyState
        title="Permission denied"
        description={
          data.permissionMessage ??
          "Your account cannot manage physical counts."
        }
      />
    );
  }

  if (!data.count) {
    return (
      <EmptyState
        title="Physical count not found"
        description="This count may have been removed or you do not have access."
      />
    );
  }

  const locationLabel = data.count.locationName;

  return (
    <div className="space-y-6">
      <PhysicalCountDetailHeader count={data.count} />

      {data.loadError ? (
        <ErrorState
          title="Some count data could not be loaded"
          message={data.loadError}
        />
      ) : null}

      {data.count.status !== "in_progress" ? (
        <p className="text-sm text-[var(--color-fg-muted)]">
          This count is read-only because it has been{" "}
          {data.count.status === "completed" ? "completed" : "cancelled"}.
        </p>
      ) : null}

      <CountLinesForm
        key={`${data.count.id}-${data.count.status}`}
        physicalCountId={data.count.id}
        locationLabel={locationLabel}
        editable={data.count.editable}
        initialLines={data.lines}
      />
    </div>
  );
}
