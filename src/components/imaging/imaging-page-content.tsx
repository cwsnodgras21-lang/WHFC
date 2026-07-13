import { ImagingLog } from "@/components/imaging/imaging-log";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { SummaryStats } from "@/components/ui/summary-stats";
import type { ImagingPageData } from "@/lib/data/imaging-page";

export function ImagingPageContent({ data }: { data: ImagingPageData }) {
  if (!data.canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Imaging log"
          description="Track imaging orders from order through results."
        />
        <ErrorState
          title="Access denied"
          message={data.permissionMessage ?? "You cannot view the imaging log."}
        />
      </div>
    );
  }

  const { highlights } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Imaging log"
        description="Track imaging orders through scheduling, completion, results, and authorization."
      />

      <SummaryStats
        aria-label="Imaging highlights"
        stats={[
          {
            label: "Appointments today",
            value: highlights.appointmentsToday,
            hint: "Scheduled for today",
            tone: highlights.appointmentsToday > 0 ? "attention" : undefined,
          },
          {
            label: "Upcoming appointments",
            value: highlights.upcomingAppointments,
            hint: "Scheduled ahead",
          },
          {
            label: "Overdue imaging",
            value: highlights.overdueImaging,
            hint: "Appointment date passed, still open",
            tone: highlights.overdueImaging > 0 ? "attention" : "success",
          },
          {
            label: "Pending authorizations",
            value: highlights.pendingAuthorizations,
            hint: "Awaiting insurance approval",
            tone: highlights.pendingAuthorizations > 0 ? "attention" : "success",
          },
        ]}
      />

      {data.loadError ? (
        <ErrorState
          title="Unable to load imaging orders"
          message={data.loadError}
        />
      ) : !data.canManage && data.rows.length === 0 ? (
        <EmptyState
          title="No imaging orders"
          description="Imaging orders will appear here once they are added."
        />
      ) : (
        <ImagingLog
          rows={data.rows}
          providers={data.providers}
          locations={data.locations}
          canManage={data.canManage}
          today={data.today}
        />
      )}
    </div>
  );
}
