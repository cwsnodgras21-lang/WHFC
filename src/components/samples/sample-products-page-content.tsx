import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatQuantity } from "@/lib/format/inventory";
import type { SampleProductsPageData } from "@/lib/data/sample-products";

export function SampleProductsPageContent({
  data,
}: {
  data: SampleProductsPageData;
}) {
  if (!data.canManage) {
    return (
      <div className="space-y-6">
        <PageHeader title="Sample products" />
        <ErrorState
          title="Access denied"
          message={
            data.permissionMessage ?? "You cannot manage sample products."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sample products"
        description="Configure the catalog of medication samples staff can receive and dispense."
        actions={
          <Link href="/samples/products/new">
            <Button variant="primary">New sample product</Button>
          </Link>
        }
      />

      {data.loadError ? (
        <ErrorState title="Unable to load sample products" message={data.loadError} />
      ) : data.products.length === 0 ? (
        <EmptyState
          title="No sample products yet"
          description="Add your first sample product to start tracking inventory."
          action={
            <Link href="/samples/products/new">
              <Button variant="primary">New sample product</Button>
            </Link>
          }
        />
      ) : (
        <DataTableShell>
          <DataTable responsive>
            <thead>
              <tr>
                <th>Product</th>
                <th>Manufacturer / vendor</th>
                <th>On hand</th>
                <th>Threshold</th>
                <th>Status</th>
                <th data-label="">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p.id}>
                  <td data-label="Product">
                    <div className="font-medium">{p.productName}</div>
                    <div className="text-xs text-muted">
                      {[p.strength, p.dosageForm].filter(Boolean).join(" · ")}
                    </div>
                  </td>
                  <td data-label="Manufacturer / vendor">
                    {p.manufacturerVendor ?? "—"}
                  </td>
                  <td data-label="On hand">
                    {formatQuantity(p.quantityOnHand)} {p.unitAbbreviation}
                  </td>
                  <td data-label="Threshold">
                    {formatQuantity(p.reorderThreshold)} {p.unitAbbreviation}
                  </td>
                  <td data-label="Status">
                    <Badge variant={p.active ? "success" : "default"}>
                      {p.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td data-label="">
                    <Link href={`/samples/products/${p.id}`}>
                      <Button variant="secondary">Edit</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </DataTableShell>
      )}
    </div>
  );
}
