"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { setVendorActiveAction } from "@/lib/actions/vendors";
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";
import type { VendorRow } from "@/lib/data/vendors-page";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField, FormInput, FormSelect } from "@/components/ui/form-field";
import { PageSection } from "@/components/ui/page-section";
import { cn } from "@/lib/cn";

type StatusFilter = "all" | "active" | "inactive";

export function VendorsCatalog({ vendors, canManage }: { vendors: VendorRow[]; canManage: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<VendorRow | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isToggling, startToggle] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendors.filter((row) => {
      const haystack = [row.name, row.contactEmail, row.contactPhone].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? row.active : !row.active);
      return matchesSearch && matchesStatus;
    });
  }, [vendors, search, statusFilter]);

  const openRow = (row: VendorRow) => {
    setSelected(row);
    setDialogMode(canManage ? "edit" : "view");
  };

  return (
    <>
      {successMessage ? (
        <Alert variant="success" message={successMessage} />
      ) : null}
      {actionError ? <Alert variant="error" message={actionError} /> : null}
      <PageSection title="Vendors" action={canManage ? <Button type="button" onClick={() => { setSelected(null); setDialogMode("create"); }}>New vendor</Button> : null}>
        <div className="card card-body space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <FormField id="vendor-search" label="Search">
              <FormInput id="vendor-search" type="search" placeholder="Search vendors…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </FormField>
            <FormField id="vendor-status" label="Status">
              <FormSelect id="vendor-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
                <option value="all">All</option><option value="active">Active only</option><option value="inactive">Inactive only</option>
              </FormSelect>
            </FormField>
          </div>
          {filtered.length === 0 ? <EmptyState title="No vendors found" description="Try a different search or create a vendor." /> : (
            <DataTableShell>
              <DataTable>
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th>{canManage ? <th>Actions</th> : null}</tr></thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className={cn("data-table-row-clickable", !row.active && "data-table-row-inactive")} onClick={() => openRow(row)}>
                      <td>{row.name}</td><td>{row.contactEmail ?? "—"}</td><td>{row.contactPhone ?? "—"}</td>
                      <td><Badge variant={row.active ? "success" : "default"}>{row.active ? "Active" : "Inactive"}</Badge></td>
                      {canManage ? (
                        <td><div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button type="button" variant="secondary" onClick={() => openRow(row)}>Edit</Button>
                          <Button type="button" variant={row.active ? "destructive" : "secondary"} disabled={isToggling} onClick={(e) => {
                            e.stopPropagation();
                            const next = !row.active;
                            if (!window.confirm(`${next ? "Activate" : "Deactivate"} "${row.name}"?`)) return;
                            startToggle(async () => {
                              const result = await setVendorActiveAction(row.id, next);
                              if (!result.success) setActionError(result.error);
                              else { setSuccessMessage(`${next ? "Activated" : "Deactivated"} "${row.name}".`); router.refresh(); }
                            });
                          }}>{row.active ? "Deactivate" : "Activate"}</Button>
                        </div></td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </DataTableShell>
          )}
        </div>
      </PageSection>
      {dialogMode ? (
        <VendorFormDialog key={dialogMode === "create" ? "create" : selected?.id} open mode={dialogMode === "create" ? "create" : "edit"} vendor={selected} readOnly={dialogMode === "view"} onClose={() => { setDialogMode(null); setSelected(null); }} onSuccess={(msg) => { setSuccessMessage(msg); router.refresh(); }} />
      ) : null}
    </>
  );
}
