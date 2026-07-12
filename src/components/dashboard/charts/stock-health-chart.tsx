"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { StockHealthCounts, StockHealthKey } from "@/lib/dashboard/analytics";
import { formatQuantity } from "@/lib/format/inventory";

import { chartColors } from "./chart-colors";
import { ChartTooltip } from "./chart-tooltip";

type Segment = {
  key: StockHealthKey;
  label: string;
  value: number;
  color: string;
};

function buildSegments(counts: StockHealthCounts): Segment[] {
  return [
    { key: "healthy", label: "Healthy", value: counts.healthy, color: chartColors.healthy },
    { key: "low", label: "Low stock", value: counts.low, color: chartColors.low },
    { key: "out", label: "Out of stock", value: counts.out, color: chartColors.out },
  ];
}

function percent(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export function StockHealthChart({ counts }: { counts: StockHealthCounts }) {
  const segments = buildSegments(counts);
  const total = counts.total;

  const summary = `${total} active ${total === 1 ? "item" : "items"}: ${counts.healthy} healthy, ${counts.low} low stock, ${counts.out} out of stock.`;

  return (
    <div>
      <div className="chart-donut">
        <div className="chart-donut-canvas" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={segments}
                dataKey="value"
                nameKey="label"
                innerRadius="64%"
                outerRadius="92%"
                paddingAngle={total > 0 ? 2 : 0}
                startAngle={90}
                endAngle={-270}
                stroke={chartColors.surface}
                strokeWidth={2}
                isAnimationActive={false}
              >
                {segments.map((segment) => (
                  <Cell key={segment.key} fill={segment.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const datum = payload[0]?.payload as Segment | undefined;
                  if (!datum) return null;
                  return (
                    <ChartTooltip
                      rows={[
                        {
                          color: datum.color,
                          label: datum.label,
                          value: `${formatQuantity(datum.value)} · ${percent(datum.value, total)}`,
                        },
                      ]}
                    />
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-donut-center" aria-hidden>
            <span className="chart-donut-total">{formatQuantity(total)}</span>
            <span className="chart-donut-caption">
              {total === 1 ? "item" : "items"}
            </span>
          </div>
        </div>

        <ul className="chart-legend" aria-hidden>
          {segments.map((segment) => (
            <li key={segment.key} className="chart-legend-item">
              <span
                className="chart-swatch"
                style={{ backgroundColor: segment.color }}
              />
              <span className="chart-legend-label">{segment.label}</span>
              <span className="chart-legend-value">
                {formatQuantity(segment.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="sr-only">{summary}</p>
    </div>
  );
}
