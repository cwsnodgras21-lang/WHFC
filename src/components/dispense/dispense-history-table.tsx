"use client";

import { useState } from "react";

import { DispenseEventDetailDialog } from "@/components/dispense/dispense-event-detail-dialog";
import { formatAdministeredSummary } from "@/lib/dispense/query";
import type { DispenseHistoryRow } from "@/lib/dispense/query";
import {
  formatDateTime,
  formatLocationDetail,
} from "@/lib/format/inventory";
import {
  DISPENSE_SOURCE_LABELS,
  type DispenseSource,
} from "@/lib/validation/dispense-history-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableShell } from "@/components/ui/data-table";

type DispenseHistoryTableProps = {
  events: DispenseHistoryRow[];
};

export function DispenseHistoryTable({ events }: DispenseHistoryTableProps) {
  const [selectedEvent, setSelectedEvent] = useState<DispenseHistoryRow | null>(
    null
  );

  return (
    <>
      <DataTableShell>
        <DataTable>
          <thead>
            <tr>
              <th>Date / time</th>
              <th>Kit</th>
              <th className="hidden lg:table-cell">Location</th>
              <th className="hidden md:table-cell">Source</th>
              <th className="hidden xl:table-cell">Administered</th>
              <th className="hidden lg:table-cell">Recorded by</th>
              <th className="hidden xl:table-cell">Items consumed</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const location = formatLocationDetail(event.locationName);
              const sourceLabel =
                DISPENSE_SOURCE_LABELS[event.source as DispenseSource] ??
                event.source;

              return (
                <tr key={event.id}>
                  <td className="muted whitespace-nowrap">
                    {formatDateTime(event.performedAt)}
                  </td>
                  <td>
                    <div className="table-cell-stack">
                      <span className="table-cell-primary font-medium">
                        {event.kitName}
                      </span>
                      {event.allowExpiredConsumption ? (
                        <Badge variant="warning">Expired stock</Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="hidden lg:table-cell">
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
                  <td className="hidden md:table-cell">{sourceLabel}</td>
                  <td className="hidden xl:table-cell text-sm">
                    {formatAdministeredSummary(event.administeredAmounts)}
                  </td>
                  <td className="hidden lg:table-cell">
                    {event.createdByName ?? "—"}
                  </td>
                  <td className="hidden xl:table-cell text-sm max-w-xs truncate">
                    {event.itemsSummary}
                  </td>
                  <td className="text-right">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setSelectedEvent(event)}
                    >
                      Details
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </DataTableShell>

      <DispenseEventDetailDialog
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </>
  );
}
