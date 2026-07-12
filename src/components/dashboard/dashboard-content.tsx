import Link from "next/link";

import { GettingStartedCard } from "@/components/dashboard/getting-started-card";
import { MovementTrendChart } from "@/components/dashboard/charts/movement-trend-chart";
import { ProcedureConsumptionChart } from "@/components/dashboard/charts/procedure-consumption-chart";
import { ProcedureUsageChart } from "@/components/dashboard/charts/procedure-usage-chart";
import { ReplenishmentChart } from "@/components/dashboard/charts/replenishment-chart";
import { StockHealthChart } from "@/components/dashboard/charts/stock-health-chart";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { TodayTasksCard } from "@/components/dashboard/today-tasks-card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { SummaryStats } from "@/components/ui/summary-stats";
import type { DashboardSummary } from "@/lib/data/dashboard";
import { buildTodayTasks } from "@/lib/dashboard/today-tasks";
import { isModuleEnabled } from "@/lib/modules/definitions";
import {
  formatDateTime,
  formatLocationDetail,
  formatQuantity,
  formatSignedQuantityWithUnit,
  formatTransactionType,
} from "@/lib/format/inventory";

type DashboardContentProps = {
  summary: DashboardSummary;
  canReceive: boolean;
  canDispense: boolean;
  canManagePoDrafts: boolean;
  canManageCounts: boolean;
};

export function DashboardContent({
  summary,
  canReceive,
  canDispense,
  canManagePoDrafts,
  canManageCounts,
}: DashboardContentProps) {
  const modules = summary.enabledModules;
  const hasLowStock = summary.belowReorderCount > 0;
  const showDispenseAction =
    canDispense && isModuleEnabled(modules, "procedure_kits");
  const showAnalytics = isModuleEnabled(modules, "analytics");
  const showReorderSuggestions = isModuleEnabled(modules, "reorder_suggestions");

  const todayTasks = buildTodayTasks(summary, {
    canManageCounts,
    canManagePoDrafts,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory overview"
        description="See what is on hand, what needs attention, and what to do next."
        actions={
          <div className="flex flex-wrap gap-2">
            {canReceive ? (
              <LinkButton href="/receive" variant="primary">
                Receive stock
              </LinkButton>
            ) : null}
            {showDispenseAction ? (
              <LinkButton href="/dispense" variant="secondary">
                Dispense kit
              </LinkButton>
            ) : null}
          </div>
        }
      />

      {summary.errors.length > 0 ? (
        <ErrorState
          title="Some dashboard data could not be loaded"
          message={summary.errors.join(" ")}
        />
      ) : null}

      <TodayTasksCard tasks={todayTasks} />

      <GettingStartedCard progress={summary.gettingStarted} />

      {showAnalytics ? (
        <SummaryStats
          aria-label="Procedure dispense summary"
          stats={[
          {
            label: "Dispenses today",
            value: summary.dispensesToday,
            hint: "Kit dispenses · UTC day",
          },
          {
            label: "Dispenses this week",
            value: summary.dispensesThisWeek,
            hint: "Since Monday UTC",
          },
          {
            label: "Top procedure (month)",
            value: summary.topProceduresThisMonth[0]?.kitName ?? "—",
            hint: summary.topProceduresThisMonth[0]
              ? `${summary.topProceduresThisMonth[0].dispenseCount} dispenses`
              : "No dispenses this month",
          },
          {
            label: "Runway alerts",
            value: summary.itemRunway.filter(
              (item) => (item.projectedDaysRemaining ?? 99) <= 14
            ).length,
            hint: "Items ≤14 days at recent usage",
            tone:
              summary.itemRunway.some(
                (item) => (item.projectedDaysRemaining ?? 99) <= 14
              )
                ? "attention"
                : "success",
          },
        ]}
        />
      ) : null}

      <SummaryStats
        aria-label="Inventory summary"
        stats={[
          {
            label: "Active items",
            value: summary.activeItems,
            hint: "Catalog items in use",
          },
          {
            label: "Low-stock items",
            value: summary.belowReorderCount,
            hint: hasLowStock ? "Below minimum level" : "Stock levels look good",
            tone: hasLowStock ? "attention" : "success",
          },
          {
            label: "Active locations",
            value: summary.activeLocations,
            hint: "Storage areas tracked",
          },
          {
            label: "Recent activity",
            value: summary.recentActivityCount,
            hint: "Inventory changes · 30 days",
          },
        ]}
      />

      {showAnalytics ? (
        <section aria-label="Inventory analytics" className="analytics-grid">
        <DashboardPanel
          title="Stock health"
          description="Active items by stock level"
        >
          {summary.stockHealth.total > 0 ? (
            <StockHealthChart counts={summary.stockHealth} />
          ) : (
            <EmptyState
              title="No active items yet"
              description="Add catalog items to see how your stock levels break down."
            />
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Replenishment priority"
          description="Top items by suggested order quantity"
          action={
            <Link href="/reorder-report" className="link-subtle">
              Reorder report
            </Link>
          }
        >
          {summary.replenishment.length > 0 ? (
            <ReplenishmentChart items={summary.replenishment} />
          ) : (
            <EmptyState
              title="Nothing to reorder"
              description="Every active item is at or above its par level."
            />
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Inventory movement"
          description="Received vs. consumed over the last 30 days"
          className="analytics-span-2"
        >
          {summary.hasMovement ? (
            <MovementTrendChart series={summary.movement} />
          ) : (
            <EmptyState
              title="Not enough activity yet"
              description="Receiving and consumption from the last 30 days will chart here as staff record inventory."
            />
          )}
        </DashboardPanel>
      </section>
      ) : null}

      {showAnalytics ? (
      <section aria-label="Procedure dispense analytics" className="analytics-grid">
        <DashboardPanel
          title="Top procedures this month"
          description="Most frequently dispensed kits"
          action={
            <Link href="/dispense/history" className="link-subtle">
              Dispense history
            </Link>
          }
        >
          {summary.topProceduresThisMonth.length > 0 ? (
            <ProcedureUsageChart items={summary.topProceduresThisMonth} />
          ) : (
            <EmptyState
              title="No dispenses this month"
              description="Kit dispense counts will appear here once procedures are recorded."
            />
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Inventory consumed by procedure"
          description="Total units decremented over the last 30 days"
        >
          {summary.consumptionByProcedure.length > 0 ? (
            <ProcedureConsumptionChart items={summary.consumptionByProcedure} />
          ) : (
            <EmptyState
              title="No procedure consumption yet"
              description="Inventory decremented through kit dispenses will chart here."
            />
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Projected stock runway"
          description="Items that may run out based on recent kit usage"
          className="analytics-span-2"
        >
          {summary.itemRunway.length > 0 ? (
            <DataTableShell>
              <DataTable className="data-table-compact">
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col" className="text-right">
                      On hand
                    </th>
                    <th scope="col" className="text-right hidden sm:table-cell">
                      Used (30d)
                    </th>
                    <th scope="col" className="text-right">
                      Days left
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.itemRunway.map((item) => (
                    <tr key={item.itemId}>
                      <td>{item.itemName}</td>
                      <td className="numeric">
                        {formatQuantity(item.onHand)}
                        {item.unitAbbreviation ? (
                          <span className="chart-unit"> {item.unitAbbreviation}</span>
                        ) : null}
                      </td>
                      <td className="numeric hidden sm:table-cell">
                        {formatQuantity(item.consumedLast30Days)}
                      </td>
                      <td className="numeric font-medium">
                        {item.projectedDaysRemaining === 0
                          ? "Out"
                          : item.projectedDaysRemaining ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </DataTableShell>
          ) : (
            <EmptyState
              title="No usage trend yet"
              description="Recent kit dispenses are needed to estimate when items may run out."
            />
          )}
        </DashboardPanel>
      </section>
      ) : null}

      {/* Needs attention — compact, top 5 by urgency */}
      <section aria-labelledby="needs-attention-heading" className="panel">
        <div
          className={`panel-header ${hasLowStock ? "panel-header-attention" : "panel-header-success"}`}
        >
          <h2 id="needs-attention-heading" className="section-heading">
            Needs attention
          </h2>
          <div className="flex items-center gap-3">
            {hasLowStock ? (
              <Badge variant="warning">
                {summary.belowReorderCount}{" "}
                {summary.belowReorderCount === 1 ? "item" : "items"}
              </Badge>
            ) : (
              <Badge variant="success">All stocked</Badge>
            )}
            {showAnalytics ? (
              <Link href="/reorder-report" className="link-subtle">
                View full reorder report
              </Link>
            ) : showReorderSuggestions ? (
              <Link href="/reorder-suggestions" className="link-subtle">
                View reorder suggestions
              </Link>
            ) : null}
          </div>
        </div>

        {hasLowStock ? (
          <DataTableShell>
            <DataTable className="data-table-compact">
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">
                    On hand
                  </th>
                  <th scope="col" className="text-right">
                    Suggested order
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.needsAttention.map((item) => {
                  const outOfStock = item.totalOnHand <= 0;

                  return (
                    <tr key={item.itemId || item.internalSku || item.itemName}>
                      <td>
                        <div className="table-cell-stack">
                          <span className="table-cell-primary">
                            {item.itemName}
                          </span>
                          {item.internalSku ? (
                            <span className="table-cell-secondary mono">
                              {item.internalSku}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <Badge variant={outOfStock ? "danger" : "warning"}>
                          {outOfStock ? "Out of stock" : "Low"}
                        </Badge>
                      </td>
                      <td className="numeric">
                        {formatQuantity(item.totalOnHand)}
                        {item.unitAbbreviation ? (
                          <span className="chart-unit"> {item.unitAbbreviation}</span>
                        ) : null}
                      </td>
                      <td className="numeric font-medium">
                        {item.suggestedOrderQuantity > 0
                          ? `+${formatQuantity(item.suggestedOrderQuantity)}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          </DataTableShell>
        ) : (
          <EmptyState
            title="Everything is well stocked"
            description="No items are below their minimum stocking levels."
          />
        )}
      </section>

      <section aria-labelledby="recent-activity-heading" className="page-section">
        <div className="section-heading-row">
          <h2 id="recent-activity-heading" className="section-heading">
            Recent activity
          </h2>
          <Link href="/transactions" className="link-subtle">
            View all activity
          </Link>
        </div>

        {summary.recentTransactions.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Receiving, using, transferring, or counting stock will show up here."
            action={
              canReceive ? (
                <LinkButton href="/receive" variant="primary">
                  Receive your first shipment
                </LinkButton>
              ) : undefined
            }
          />
        ) : (
          <DataTableShell>
            <DataTable className="data-table-compact">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Item</th>
                  <th scope="col" className="hidden md:table-cell">
                    Location
                  </th>
                  <th scope="col" className="hidden sm:table-cell">
                    Type
                  </th>
                  <th scope="col" className="text-right">
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.recentTransactions.map((tx) => {
                  const location = formatLocationDetail(
                    tx.location_name,
                    tx.room,
                    tx.cabinet
                  );

                  return (
                    <tr key={tx.id ?? `${tx.occurred_at}-${tx.transaction_type}`}>
                      <td className="muted whitespace-nowrap">
                        {formatDateTime(tx.occurred_at)}
                      </td>
                      <td>
                        <div className="table-cell-stack">
                          <span className="table-cell-primary">
                            {tx.item_name ?? "—"}
                          </span>
                          {tx.internal_sku ? (
                            <span className="table-cell-secondary mono">
                              {tx.internal_sku}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="hidden md:table-cell">
                        <div className="table-cell-stack">
                          <span className="table-cell-primary">
                            {location.primary}
                          </span>
                          {location.secondary ? (
                            <span className="table-cell-secondary">
                              {location.secondary}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell">
                        {formatTransactionType(tx.transaction_type)}
                      </td>
                      <td className="numeric whitespace-nowrap font-medium">
                        {formatSignedQuantityWithUnit(
                          tx.quantity,
                          tx.transaction_type,
                          tx.reason_code,
                          tx.unit_abbreviation
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          </DataTableShell>
        )}
      </section>
    </div>
  );
}
