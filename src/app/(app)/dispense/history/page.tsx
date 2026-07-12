import { DispenseHistoryPageContent } from "@/components/dispense/dispense-history-page-content";
import { requireSession } from "@/lib/auth/session";
import { getDispenseHistoryPageData } from "@/lib/data/dispense-history-page";
import { ModulePageGuard } from "@/lib/modules/guard";
import { parseDispenseHistoryPageFilters } from "@/lib/validation/dispense-history-page";
import { createClient } from "@/lib/supabase/server";

type DispenseHistoryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DispenseHistoryPage({
  searchParams,
}: DispenseHistoryPageProps) {
  const session = await requireSession();
  const supabase = await createClient();
  const filters = parseDispenseHistoryPageFilters(await searchParams);
  const data = await getDispenseHistoryPageData(supabase, session, filters);

  return (
    <ModulePageGuard moduleKey="dispense_history">
      <DispenseHistoryPageContent data={data} />
    </ModulePageGuard>
  );
}
