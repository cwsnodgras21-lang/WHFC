import { LocationsPageContent } from "@/components/locations/locations-page-content";
import { requireSession } from "@/lib/auth/session";
import { getLocationsPageData } from "@/lib/data/locations-page";
import { createClient } from "@/lib/supabase/server";
import { parseActiveStatusFilter } from "@/lib/validation/catalog-filters";

type LocationsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LocationsPage({
  searchParams,
}: LocationsPageProps) {
  const session = await requireSession();
  const supabase = await createClient();
  const [data, params] = await Promise.all([
    getLocationsPageData(supabase, session),
    searchParams,
  ]);

  return (
    <LocationsPageContent
      data={data}
      initialStatusFilter={parseActiveStatusFilter(params.status)}
    />
  );
}
