import { DispensePageContent } from "@/components/dispense/dispense-page-content";
import { requireSession } from "@/lib/auth/session";
import { getDispensePageData } from "@/lib/data/dispense";
import { ModulePageGuard } from "@/lib/modules/guard";
import { createClient } from "@/lib/supabase/server";

export default async function DispensePage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getDispensePageData(supabase, session);

  return (
    <ModulePageGuard moduleKey="procedure_kits">
      <DispensePageContent data={data} />
    </ModulePageGuard>
  );
}
