import { ReorderReportPageContent } from "@/components/reorder-report/reorder-report-page-content";
import { getReorderReportPageData } from "@/lib/data/reorder-report-page";
import { requireSession } from "@/lib/auth/session";
import { ModulePageGuard } from "@/lib/modules/guard";
import { createClient } from "@/lib/supabase/server";
import { parseReorderReportPageFilters } from "@/lib/validation/reorder-report-page";

type ReorderReportPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReorderReportPage({
  searchParams,
}: ReorderReportPageProps) {
  const session = await requireSession();
  const supabase = await createClient();
  const filters = parseReorderReportPageFilters(await searchParams);
  const data = await getReorderReportPageData(supabase, session, filters);

  return (
    <ModulePageGuard moduleKey="analytics">
      <ReorderReportPageContent data={data} />
    </ModulePageGuard>
  );
}
