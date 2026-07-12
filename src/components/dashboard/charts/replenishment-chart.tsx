"use client";

import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ReplenishmentItem } from "@/lib/dashboard/analytics";
import { formatQuantity } from "@/lib/format/inventory";

import { CHART_FONT_FAMILY, CHART_TICK_FONT_SIZE, chartColors } from "./chart-colors";
import { ChartTooltip } from "./chart-tooltip";

const FG = "#2e2a27"; // --color-fg
const AXIS = chartColors.axis;

type Row = ReplenishmentItem & { unitLabel: string; valueLabel: string };

function truncate(value: string, max = 22): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function unitSuffix(unit: string | null): string {
  const trimmed = unit?.trim();
  return trimmed ? ` ${trimmed}` : "";
}

export function ReplenishmentChart({ items }: { items: ReplenishmentItem[] }) {
  const rows: Row[] = items.map((item) => ({
    ...item,
    unitLabel: unitSuffix(item.unitAbbreviation),
    valueLabel: `${formatQuantity(item.suggestedOrderQuantity)}${unitSuffix(item.unitAbbreviation)}`,
  }));

  const summary = `Top ${rows.length} ${rows.length === 1 ? "item" : "items"} to reorder by suggested quantity: ${rows
    .map((row) => `${row.itemName} ${row.valueLabel}`)
    .join(", ")}.`;

  return (
    <div>
      <div
        className="chart-bars"
        style={{ height: Math.max(rows.length, 1) * 44 + 16 }}
        aria-hidden
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 64, bottom: 4, left: 0 }}
            barCategoryGap="28%"
          >
            <XAxis
              type="number"
              hide
              domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.2)]}
            />
            <YAxis
              type="category"
              dataKey="itemName"
              width={132}
              axisLine={false}
              tickLine={false}
              tick={{ fill: FG, fontSize: CHART_TICK_FONT_SIZE, fontFamily: CHART_FONT_FAMILY }}
              tickFormatter={(value: string) => truncate(value)}
            />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const datum = payload[0]?.payload as Row | undefined;
                if (!datum) return null;
                return (
                  <ChartTooltip
                    title={datum.itemName}
                    rows={[
                      {
                        color: chartColors.replenishment,
                        label: "Suggested order",
                        value: datum.valueLabel,
                      },
                    ]}
                  />
                );
              }}
            />
            <Bar
              dataKey="suggestedOrderQuantity"
              fill={chartColors.replenishment}
              radius={[0, 4, 4, 0]}
              maxBarSize={22}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="valueLabel"
                position="right"
                style={{ fill: AXIS, fontSize: CHART_TICK_FONT_SIZE, fontFamily: CHART_FONT_FAMILY }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="sr-only">{summary}</p>
    </div>
  );
}
