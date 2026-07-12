import { ProcedureKitEditorPageContent } from "@/components/procedure-kits/procedure-kit-editor-page-content";
import { requireSession } from "@/lib/auth/session";
import { getProcedureKitEditorData } from "@/lib/data/procedure-kits";
import { ModulePageGuard } from "@/lib/modules/guard";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ kitId: string }>;
};

export default async function EditProcedureKitPage({ params }: PageProps) {
  const { kitId } = await params;
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getProcedureKitEditorData(supabase, session, kitId);

  return (
    <ModulePageGuard moduleKey="procedure_kits">
      <ProcedureKitEditorPageContent
        data={data}
        kitId={kitId}
        title={data.kit?.name ?? "Edit procedure kit"}
      />
    </ModulePageGuard>
  );
}
