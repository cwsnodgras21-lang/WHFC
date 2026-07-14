import { ImagingPageContent } from "@/components/imaging/imaging-page-content";
import { getImagingPageData } from "@/lib/data/imaging-page";
import { requireSession } from "@/lib/auth/session";
import { ModulePageGuard } from "@/lib/modules/guard";
import { createClient } from "@/lib/supabase/server";
import { parseImagingPageFilters } from "@/lib/validation/imaging-page";

type ImagingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ImagingPage({ searchParams }: ImagingPageProps) {
  const session = await requireSession();
  const supabase = await createClient();
  const filters = parseImagingPageFilters(await searchParams);
  const data = await getImagingPageData(supabase, session, filters);

  return (
    <ModulePageGuard moduleKey="imaging_log">
      <ImagingPageContent data={data} />
    </ModulePageGuard>
  );
}
