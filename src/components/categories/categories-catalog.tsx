"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { setCategoryActiveAction } from "@/lib/actions/categories";
import { CategoryFormDialog } from "@/components/categories/category-form-dialog";
import type { CategoryRow } from "@/lib/data/categories-page";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField, FormInput, FormSelect } from "@/components/ui/form-field";
import { PageSection } from "@/components/ui/page-section";
import { cn } from "@/lib/cn";

type StatusFilter = "all" | "active" | "inactive";
type DialogMode = "create" | "edit" | "view" | null;

type CategoriesCatalogProps = {
  categories: CategoryRow[];
  canManage: boolean;
};

export function CategoriesCatalog({ categories, canManage }: CategoriesCatalogProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selected, setSelected] = useState<CategoryRow | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isToggling, startToggle] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter((row) => {
      const matchesSearch = !q || row.name.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? row.active : !row.active);
      return matchesSearch && matchesStatus;
    });
  }, [categories, search, statusFilter]);

  const openRow = (row: CategoryRow) => {
    setSelected(row);
    setDialogMode(canManage ? "edit" : "view");
  };

  const handleToggle = (row: CategoryRow, event: React.MouseEvent) => {
    event.stopPropagation();
    const next = !row.active;
    if (!window.confirm(`${next ? "Activate" : "Deactivate"} "${row.name}"?`)) return;
    startToggle(async () => {
      const result = await setCategoryActiveAction(row.id, next);
      if (!result.success) {
        setActionError(result.error);
        return;
      }
      setSuccessMessage(`${next ? "Activated" : "Deactivated"} "${row.name}".`);
      router.refresh();
    });
  };

  return (
    <>
      {successMessage ? (
        <Alert variant="success" message={successMessage} />
      ) : null}
      {actionError ? <Alert variant="error" message={actionError} /> : null}

      <PageSection
        title="Categories"
        action={
          canManage ? (
            <Button type="button" onClick={() => { setSelected(null); setDialogMode("create"); }}>
              New category
            </Button>
          ) : null
        }
      >
        <div className="card card-body space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <FormField id="category-search" label="Search">
              <FormInput id="category-search" type="search" placeholder="Search categories…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </FormField>
            <FormField id="category-status" label="Status">
              <FormSelect id="category-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
                <option value="all">All</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </FormSelect>
            </FormField>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No categories found" description="Try a different search or create a category." />
          ) : (
            <DataTableShell>
              <DataTable>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    {canManage ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      className={cn("data-table-row-clickable", !row.active && "data-table-row-inactive")}
                      onClick={() => openRow(row)}
                    >
                      <td>{row.name}</td>
                      <td>{row.description ?? "—"}</td>
                      <td>
                        <Badge variant={row.active ? "success" : "default"}>
                          {row.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      {canManage ? (
                        <td>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button type="button" variant="secondary" onClick={() => openRow(row)}>Edit</Button>
                            <Button type="button" variant={row.active ? "destructive" : "secondary"} disabled={isToggling} onClick={(e) => handleToggle(row, e)}>
                              {row.active ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        </td>
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
        <CategoryFormDialog
          key={dialogMode === "create" ? "create" : selected?.id}
          open
          mode={dialogMode === "create" ? "create" : "edit"}
          category={selected}
          readOnly={dialogMode === "view"}
          onClose={() => { setDialogMode(null); setSelected(null); }}
          onSuccess={(msg) => { setSuccessMessage(msg); router.refresh(); }}
        />
      ) : null}
    </>
  );
}
