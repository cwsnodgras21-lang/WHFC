import { SampleHistoryPageContent } from "@/components/samples/sample-history-page-content";
import { requireSession } from "@/lib/auth/session";
import { getSampleHistoryPageData } from "@/lib/data/samples";
import { ModulePageGuard } from "@/lib/modules/guard";
import { createClient } from "@/lib/supabase/server";

export default async function SampleHistoryPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getSampleHistoryPageData(supabase, session, {});

  return (
    <ModulePageGuard moduleKey="samples">
      <SampleHistoryPageContent data={data} />
    </ModulePageGuard>
  );
}
