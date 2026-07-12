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

import type { ProcedureConsumption } from "@/lib/dispense/analytics";
import { formatQuantity } from "@/lib/format/inventory";

import { CHART_FONT_FAMILY, CHART_TICK_FONT_SIZE, chartColors } from "./chart-colors";
import { ChartTooltip } from "./chart-tooltip";

const FG = "#2e2a27";
const AXIS = chartColors.axis;

type Row = ProcedureConsumption & { valueLabel: string };

function truncate(value: string, max = 22): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function ProcedureConsumptionChart({
  items,
}: {
  items: ProcedureConsumption[];
}) {
  const rows: Row[] = items.map((item) => ({
    ...item,
    valueLabel: formatQuantity(item.totalQuantity),
  }));

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
            <XAxis type="number" hide domain={[0, (max: number) => Math.ceil(max * 1.2)]} />
            <YAxis
              type="category"
              dataKey="kitName"
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
                    title={datum.kitName}
                    rows={[
                      {
                        color: chartColors.consumed,
                        label: "Units consumed",
                        value: datum.valueLabel,
                      },
                    ]}
                  />
                );
              }}
            />
            <Bar
              dataKey="totalQuantity"
              fill={chartColors.consumed}
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
    </div>
  );
}
