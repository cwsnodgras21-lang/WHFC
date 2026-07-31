import { ReceiveSampleForm } from "@/components/samples/receive-sample-form";
import { requireSession } from "@/lib/auth/session";
import { getSampleReceivePageData } from "@/lib/data/samples";
import { ModulePageGuard } from "@/lib/modules/guard";
import { createClient } from "@/lib/supabase/server";

export default async function ReceiveSamplesPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getSampleReceivePageData(supabase, session);

  return (
    <ModulePageGuard moduleKey="samples">
      <ReceiveSampleForm data={data} />
    </ModulePageGuard>
  );
}
