import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import type { ProcedureKitsPageData } from "@/lib/data/procedure-kits";

type ProcedureKitsPageContentProps = {
  data: ProcedureKitsPageData;
};

export function ProcedureKitsPageContent({
  data,
}: ProcedureKitsPageContentProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Procedure kits"
        description="Configure dispense recipes that decrement multiple inventory items at once."
        actions={
          data.canManage ? (
            <LinkButton href="/procedure-kits/new" variant="primary">
              New kit
            </LinkButton>
          ) : undefined
        }
      />

      {!data.canManage ? (
        <EmptyState
          title="Permission denied"
          description={
            data.permissionMessage ??
            "Your account cannot manage procedure kits."
          }
        />
      ) : (
        <>
          {data.loadError ? (
            <ErrorState
              title="Procedure kits could not be loaded"
              message={data.loadError}
            />
          ) : null}

          {data.kits.length === 0 ? (
            <div className="space-y-4">
              <EmptyState
                title="No procedure kits yet"
                description="Create a kit to define which items are decremented for each procedure."
              />
              <LinkButton href="/procedure-kits/new" variant="primary">
                Create first kit
              </LinkButton>
            </div>
          ) : (
            <DataTableShell>
              <DataTable>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Components</th>
                    <th>Default location</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.kits.map((kit) => (
                    <tr key={kit.id}>
                      <td>
                        <div>
                          <Link
                            href={`/procedure-kits/${kit.id}`}
                            className="link font-medium"
                          >
                            {kit.name}
                          </Link>
                          {kit.description ? (
                            <p className="text-sm text-muted mt-0.5">
                              {kit.description}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td>{kit.componentCount}</td>
                      <td>{kit.defaultLocationName ?? "—"}</td>
                      <td>
                        <Badge variant={kit.active ? "success" : "default"}>
                          {kit.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/procedure-kits/${kit.id}`}
                          className="link-subtle text-sm"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </DataTableShell>
          )}
        </>
      )}
    </div>
  );
}
