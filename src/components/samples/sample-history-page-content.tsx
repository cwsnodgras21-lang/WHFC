"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateTime, formatQuantity } from "@/lib/format/inventory";
import type { SampleHistoryPageData } from "@/lib/data/samples";

const TYPE_LABELS: Record<string, string> = {
  RECEIVE: "Received",
  DISPENSE: "Given to patient",
  ADJUSTMENT_INCREASE: "Adjusted up",
  ADJUSTMENT_DECREASE: "Adjusted down",
};

export function SampleHistoryPageContent({
  data,
}: {
  data: SampleHistoryPageData;
}) {
  const [productFilter, setProductFilter] = useState("");
  const [patientFilter, setPatientFilter] = useState("");

  const products = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of data.rows) {
      seen.set(row.sampleProductId, row.productName);
    }
    return Array.from(seen.entries());
  }, [data.rows]);

  const filtered = useMemo(() => {
    return data.rows.filter((row) => {
      if (productFilter && row.sampleProductId !== productFilter) return false;
      if (
        patientFilter &&
        !(row.patientReference ?? "").toLowerCase().includes(patientFilter.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [data.rows, productFilter, patientFilter]);

  if (!data.canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="Sample history" />
        <ErrorState
          title="Access denied"
          message={data.permissionMessage ?? "You cannot view sample history."}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sample history"
        description="Receipts, dispenses, and inventory adjustments for medication samples."
        actions={
          <Button
            type="button"
            variant="secondary"
            className="sample-history-no-print"
            onClick={() => window.print()}
          >
            Print
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 sample-history-no-print">
        <select
          className="form-select"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          aria-label="Filter by product"
        >
          <option value="">All products</option>
          {products.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <input
          type="search"
          className="form-input"
          placeholder="Filter by patient reference…"
          value={patientFilter}
          onChange={(e) => setPatientFilter(e.target.value)}
          aria-label="Filter by patient reference"
        />
      </div>

      {data.loadError ? (
        <ErrorState title="Unable to load sample history" message={data.loadError} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No sample activity"
          description="Receipts and dispenses will appear here."
        />
      ) : (
        <DataTableShell>
          <DataTable responsive>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Patient reference</th>
                <th>Staff</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td data-label="Date">{formatDateTime(row.transactionDate)}</td>
                  <td data-label="Type">
                    <Badge
                      variant={
                        row.transactionType === "DISPENSE"
                          ? "info"
                          : row.transactionType === "RECEIVE"
                            ? "success"
                            : "caution"
                      }
                    >
                      {TYPE_LABELS[row.transactionType] ?? row.transactionType}
                    </Badge>
                  </td>
                  <td data-label="Product">{row.productName}</td>
                  <td data-label="Quantity">{formatQuantity(row.quantity)}</td>
                  <td data-label="Patient reference">{row.patientReference ?? "—"}</td>
                  <td data-label="Staff">{row.performedByName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </DataTableShell>
      )}
    </div>
  );
}
