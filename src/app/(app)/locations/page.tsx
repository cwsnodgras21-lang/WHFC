import { LocationsPageContent } from "@/components/locations/locations-page-content";
import { requireSession } from "@/lib/auth/session";
import { getLocationsPageData } from "@/lib/data/locations-page";
import { createClient } from "@/lib/supabase/server";

export default async function LocationsPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getLocationsPageData(supabase, session);

  return <LocationsPageContent data={data} />;
}
