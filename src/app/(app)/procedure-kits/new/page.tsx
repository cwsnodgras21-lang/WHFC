import { ProcedureKitEditorPageContent } from "@/components/procedure-kits/procedure-kit-editor-page-content";
import { requireSession } from "@/lib/auth/session";
import { getProcedureKitEditorData } from "@/lib/data/procedure-kits";
import { ModulePageGuard } from "@/lib/modules/guard";
import { createClient } from "@/lib/supabase/server";

export default async function NewProcedureKitPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getProcedureKitEditorData(supabase, session);

  return (
    <ModulePageGuard moduleKey="procedure_kits">
      <ProcedureKitEditorPageContent
        data={data}
        title="New procedure kit"
      />
    </ModulePageGuard>
  );
}
