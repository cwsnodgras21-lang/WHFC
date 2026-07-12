"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MovementDay } from "@/lib/dashboard/analytics";
import { formatQuantity } from "@/lib/format/inventory";

import { CHART_FONT_FAMILY, CHART_TICK_FONT_SIZE, chartColors } from "./chart-colors";
import { ChartTooltip } from "./chart-tooltip";

const SERIES = [
  { key: "received", label: "Received", color: chartColors.received },
  { key: "consumed", label: "Consumed", color: chartColors.consumed },
] as const;

function formatDay(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function MovementTrendChart({ series }: { series: MovementDay[] }) {
  const tickInterval = Math.max(0, Math.ceil(series.length / 6) - 1);

  const totalReceived = series.reduce((sum, day) => sum + day.received, 0);
  const totalConsumed = series.reduce((sum, day) => sum + day.consumed, 0);
  const summary = `Over the last ${series.length} days: ${formatQuantity(totalReceived)} received, ${formatQuantity(totalConsumed)} consumed.`;

  return (
    <div>
      <ul className="chart-legend chart-legend--inline" aria-hidden>
        {SERIES.map((s) => (
          <li key={s.key} className="chart-legend-item">
            <span className="chart-swatch" style={{ backgroundColor: s.color }} />
            <span className="chart-legend-label">{s.label}</span>
          </li>
        ))}
      </ul>

      <div className="chart-lines" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series}
            margin={{ top: 8, right: 12, bottom: 4, left: -12 }}
          >
            <XAxis
              dataKey="date"
              interval={tickInterval}
              tickFormatter={formatDay}
              axisLine={{ stroke: chartColors.grid }}
              tickLine={false}
              tick={{ fill: chartColors.axis, fontSize: CHART_TICK_FONT_SIZE, fontFamily: CHART_FONT_FAMILY }}
              minTickGap={8}
            />
            <YAxis
              width={44}
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: chartColors.axis, fontSize: CHART_TICK_FONT_SIZE, fontFamily: CHART_FONT_FAMILY }}
            />
            <Tooltip
              cursor={{ stroke: chartColors.axis, strokeWidth: 1, strokeDasharray: "3 3" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <ChartTooltip
                    title={formatDay(String(label))}
                    rows={SERIES.map((s) => {
                      const point = payload.find((p) => p.dataKey === s.key);
                      return {
                        color: s.color,
                        label: s.label,
                        value: formatQuantity(Number(point?.value ?? 0)),
                      };
                    })}
                  />
                );
              }}
            />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="linear"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="sr-only">{summary}</p>
    </div>
  );
}
