import { cn } from "@/lib/cn";

export type TooltipRow = {
  color?: string;
  label: string;
  value: string;
};

/**
 * Shared tooltip surface for the dashboard charts — a small white card with a
 * thin border, matching the product's flat panels. Callers map recharts payload
 * into a title + rows so every chart reads identically.
 */
export function ChartTooltip({
  title,
  rows,
  className,
}: {
  title?: string;
  rows: TooltipRow[];
  className?: string;
}) {
  return (
    <div className={cn("chart-tooltip", className)}>
      {title ? <p className="chart-tooltip-title">{title}</p> : null}
      <ul className="chart-tooltip-rows">
        {rows.map((row, index) => (
          <li key={`${row.label}-${index}`} className="chart-tooltip-row">
            {row.color ? (
              <span
                className="chart-swatch"
                style={{ backgroundColor: row.color }}
                aria-hidden
              />
            ) : null}
            <span className="chart-tooltip-label">{row.label}</span>
            <span className="chart-tooltip-value">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
