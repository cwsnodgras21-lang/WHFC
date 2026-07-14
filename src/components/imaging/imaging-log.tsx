"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  setImagingAuthorizationAction,
  setImagingStatusAction,
} from "@/lib/actions/imaging";
import { ImagingOrderFormDialog } from "@/components/imaging/imaging-order-form-dialog";
import type { ImagingOrderRow } from "@/lib/data/imaging-page";
import {
  IMAGING_AUTHORIZATION_BADGE,
  IMAGING_AUTHORIZATION_LABELS,
  IMAGING_AUTHORIZATION_STATUSES,
  IMAGING_STATUSES,
  IMAGING_STATUS_BADGE,
  IMAGING_STATUS_LABELS,
  type ImagingAuthorizationStatus,
  type ImagingStatus,
} from "@/lib/imaging/constants";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField, FormInput, FormSelect } from "@/components/ui/form-field";
import { PageSection } from "@/components/ui/page-section";
import { formatDate } from "@/lib/format/inventory";
import { cn } from "@/lib/cn";

type ImagingLogProps = {
  rows: ImagingOrderRow[];
  providers: string[];
  locations: string[];
  canManage: boolean;
  today: string;
};

type StatusFilter = "all" | ImagingStatus;
type AuthFilter = "all" | ImagingAuthorizationStatus;

function formatTime(value: string | null): string {
  return value ? value.slice(0, 5) : "";
}

export function ImagingLog({
  rows,
  providers,
  locations,
  canManage,
  today,
}: ImagingLogProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [authFilter, setAuthFilter] = useState<AuthFilter>("all");
  const [providerFilter, setProviderFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<ImagingOrderRow | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (authFilter !== "all" && row.authorizationStatus !== authFilter) {
        return false;
      }
      if (providerFilter && row.orderingProvider !== providerFilter) {
        return false;
      }
      if (locationFilter && row.imagingLocation !== locationFilter) {
        return false;
      }
      if (query) {
        const haystack = [
          row.patientReference,
          row.orderingProvider,
          row.imagingType,
          row.imagingLocation,
          row.authorizationNumber,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, authFilter, providerFilter, locationFilter]);

  const updateStatus = (row: ImagingOrderRow, status: ImagingStatus) => {
    setActionError(null);
    startTransition(async () => {
      const result = await setImagingStatusAction(row.id, status);
      if (!result.success) {
        setActionError(result.error);
        return;
      }
      setSuccessMessage(
        `Marked ${row.imagingType} as ${IMAGING_STATUS_LABELS[status].toLowerCase()}.`
      );
      router.refresh();
    });
  };

  const updateAuthorization = (
    row: ImagingOrderRow,
    authorizationStatus: ImagingAuthorizationStatus
  ) => {
    setActionError(null);
    startTransition(async () => {
      const result = await setImagingAuthorizationAction({
        id: row.id,
        authorizationStatus,
      });
      if (!result.success) {
        setActionError(result.error);
        return;
      }
      setSuccessMessage(
        `Authorization set to ${IMAGING_AUTHORIZATION_LABELS[authorizationStatus].toLowerCase()}.`
      );
      router.refresh();
    });
  };

  return (
    <>
      {successMessage ? <Alert variant="success" message={successMessage} /> : null}
      {actionError ? <Alert variant="error" message={actionError} /> : null}

      <PageSection
        title="Imaging orders"
        action={
          canManage ? (
            <Button
              type="button"
              onClick={() => {
                setSelected(null);
                setDialogMode("create");
              }}
            >
              New imaging order
            </Button>
          ) : null
        }
      >
        <div className="card card-body space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <FormField id="imaging-search" label="Search">
              <FormInput
                id="imaging-search"
                type="search"
                placeholder="Reference, provider, type…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </FormField>
            <FormField id="imaging-status-filter" label="Status">
              <FormSelect
                id="imaging-status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
              >
                <option value="all">All statuses</option>
                {IMAGING_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {IMAGING_STATUS_LABELS[status]}
                  </option>
                ))}
              </FormSelect>
            </FormField>
            <FormField id="imaging-auth-filter" label="Authorization">
              <FormSelect
                id="imaging-auth-filter"
                value={authFilter}
                onChange={(event) =>
                  setAuthFilter(event.target.value as AuthFilter)
                }
              >
                <option value="all">All authorizations</option>
                {IMAGING_AUTHORIZATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {IMAGING_AUTHORIZATION_LABELS[status]}
                  </option>
                ))}
              </FormSelect>
            </FormField>
            <FormField id="imaging-provider-filter" label="Provider">
              <FormSelect
                id="imaging-provider-filter"
                value={providerFilter}
                onChange={(event) => setProviderFilter(event.target.value)}
              >
                <option value="">All providers</option>
                {providers.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </FormSelect>
            </FormField>
            <FormField id="imaging-location-filter" label="Location">
              <FormSelect
                id="imaging-location-filter"
                value={locationFilter}
                onChange={(event) => setLocationFilter(event.target.value)}
              >
                <option value="">All locations</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </FormSelect>
            </FormField>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="No imaging orders"
              description="Try a different filter, or add a new imaging order to start tracking it."
            />
          ) : (
            <DataTableShell>
              <DataTable>
                <thead>
                  <tr>
                    <th scope="col">Patient / Type</th>
                    <th scope="col">Provider</th>
                    <th scope="col" className="hidden md:table-cell">
                      Location
                    </th>
                    <th scope="col">Appointment</th>
                    <th scope="col">Status</th>
                    <th scope="col">Authorization</th>
                    {canManage ? <th scope="col">Edit</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const overdue =
                      row.appointmentDate !== null &&
                      row.appointmentDate < today &&
                      (row.status === "ordered" || row.status === "scheduled");
                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="table-cell-stack">
                            <span className="table-cell-primary">
                              {row.imagingType}
                            </span>
                            <span className="table-cell-secondary mono">
                              {row.patientReference}
                            </span>
                          </div>
                        </td>
                        <td>{row.orderingProvider}</td>
                        <td className="hidden md:table-cell">
                          {row.imagingLocation ?? "—"}
                        </td>
                        <td>
                          {row.appointmentDate ? (
                            <div className="table-cell-stack">
                              <span
                                className={cn(
                                  "table-cell-primary",
                                  overdue &&
                                    "text-[var(--color-danger)] font-medium"
                                )}
                              >
                                {formatDate(row.appointmentDate)}
                                {overdue ? " · overdue" : ""}
                              </span>
                              {row.appointmentTime ? (
                                <span className="table-cell-secondary">
                                  {formatTime(row.appointmentTime)}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-[var(--color-fg-muted)]">
                              Not scheduled
                            </span>
                          )}
                        </td>
                        <td>
                          {canManage ? (
                            <FormSelect
                              aria-label={`Status for ${row.imagingType}`}
                              className="data-table-inline-select"
                              value={row.status}
                              disabled={isPending}
                              onChange={(event) =>
                                updateStatus(
                                  row,
                                  event.target.value as ImagingStatus
                                )
                              }
                            >
                              {IMAGING_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {IMAGING_STATUS_LABELS[status]}
                                </option>
                              ))}
                            </FormSelect>
                          ) : (
                            <Badge variant={IMAGING_STATUS_BADGE[row.status]}>
                              {IMAGING_STATUS_LABELS[row.status]}
                            </Badge>
                          )}
                        </td>
                        <td>
                          {canManage ? (
                            <FormSelect
                              aria-label={`Authorization for ${row.imagingType}`}
                              className="data-table-inline-select"
                              value={row.authorizationStatus}
                              disabled={isPending}
                              onChange={(event) =>
                                updateAuthorization(
                                  row,
                                  event.target.value as ImagingAuthorizationStatus
                                )
                              }
                            >
                              {IMAGING_AUTHORIZATION_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {IMAGING_AUTHORIZATION_LABELS[status]}
                                </option>
                              ))}
                            </FormSelect>
                          ) : (
                            <Badge
                              variant={
                                IMAGING_AUTHORIZATION_BADGE[
                                  row.authorizationStatus
                                ]
                              }
                            >
                              {
                                IMAGING_AUTHORIZATION_LABELS[
                                  row.authorizationStatus
                                ]
                              }
                            </Badge>
                          )}
                        </td>
                        {canManage ? (
                          <td>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                setSelected(row);
                                setDialogMode("edit");
                              }}
                            >
                              Edit
                            </Button>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </DataTable>
            </DataTableShell>
          )}
        </div>
      </PageSection>

      {dialogMode ? (
        <ImagingOrderFormDialog
          key={dialogMode === "create" ? "create" : selected?.id}
          open
          mode={dialogMode}
          order={selected}
          onClose={() => {
            setDialogMode(null);
            setSelected(null);
          }}
          onSuccess={(message) => {
            setSuccessMessage(message);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
