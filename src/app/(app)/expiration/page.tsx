import { ExpirationCenterPageContent } from "@/components/expiration-center/expiration-center-page-content";
import { getExpirationCenterData } from "@/lib/data/expiration-center-page";
import { requireSession } from "@/lib/auth/session";
import { ModulePageGuard } from "@/lib/modules/guard";
import { createClient } from "@/lib/supabase/server";
import { parseExpirationCenterPageFilters } from "@/lib/validation/expiration-center-page";

type ExpirationPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExpirationPage({
  searchParams,
}: ExpirationPageProps) {
  const session = await requireSession();
  const supabase = await createClient();
  const filters = parseExpirationCenterPageFilters(await searchParams);
  const data = await getExpirationCenterData(supabase, session, filters);

  return (
    <ModulePageGuard moduleKey="expiration_tracking">
      <ExpirationCenterPageContent data={data} />
    </ModulePageGuard>
  );
}
