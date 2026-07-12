import { ProcedureKitsPageContent } from "@/components/procedure-kits/procedure-kits-page-content";
import { requireSession } from "@/lib/auth/session";
import { getProcedureKitsPageData } from "@/lib/data/procedure-kits";
import { ModulePageGuard } from "@/lib/modules/guard";
import { createClient } from "@/lib/supabase/server";

export default async function ProcedureKitsPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getProcedureKitsPageData(supabase, session);

  return (
    <ModulePageGuard moduleKey="procedure_kits">
      <ProcedureKitsPageContent data={data} />
    </ModulePageGuard>
  );
}
