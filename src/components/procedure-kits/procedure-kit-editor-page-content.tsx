import { ProcedureKitEditor } from "@/components/procedure-kits/procedure-kit-editor";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import type { ProcedureKitEditorData } from "@/lib/data/procedure-kits";

type ProcedureKitEditorPageContentProps = {
  data: ProcedureKitEditorData;
  kitId?: string;
  title: string;
};

export function ProcedureKitEditorPageContent({
  data,
  kitId,
  title,
}: ProcedureKitEditorPageContentProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description="Configure kit components and dispense rules." />

      {!data.canManage ? (
        <EmptyState
          title="Permission denied"
          description={
            data.permissionMessage ??
            "Your account cannot manage procedure kits."
          }
        />
      ) : kitId && !data.kit ? (
        <EmptyState
          title="Kit not found"
          description="This procedure kit may have been removed."
        />
      ) : (
        <>
          {data.loadError ? (
            <ErrorState
              title="Kit data could not be loaded"
              message={data.loadError}
            />
          ) : null}

          <ProcedureKitEditor data={data} kitId={kitId} />
        </>
      )}
    </div>
  );
}
