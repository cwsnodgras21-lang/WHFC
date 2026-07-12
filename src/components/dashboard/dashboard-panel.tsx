import { cn } from "@/lib/cn";

type DashboardPanelProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * Flat panel chrome for a single dashboard chart — thin border, restrained
 * radius, compact header. Deliberately not an oversized analytics card.
 */
export function DashboardPanel({
  title,
  description,
  action,
  children,
  className,
}: DashboardPanelProps) {
  return (
    <section className={cn("panel chart-panel", className)}>
      <div className="panel-header">
        <div className="chart-panel-heading">
          <h2 className="section-heading">{title}</h2>
          {description ? (
            <p className="chart-panel-desc">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="chart-panel-body">{children}</div>
    </section>
  );
}
