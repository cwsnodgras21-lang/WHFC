import { DispenseSampleForm } from "@/components/samples/dispense-sample-form";
import { requireSession } from "@/lib/auth/session";
import { getSampleDispensePageData } from "@/lib/data/samples";
import { ModulePageGuard } from "@/lib/modules/guard";
import { createClient } from "@/lib/supabase/server";

export default async function DispenseSamplePage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getSampleDispensePageData(supabase, session);

  return (
    <ModulePageGuard moduleKey="samples">
      <DispenseSampleForm data={data} />
    </ModulePageGuard>
  );
}
