import { notFound } from "next/navigation";

import { LocationDetailContent } from "@/components/locations/location-detail-content";
import { requireSession } from "@/lib/auth/session";
import { getLocationDetailData } from "@/lib/data/location-detail";
import { createClient } from "@/lib/supabase/server";

type LocationDetailPageProps = {
  params: Promise<{ locationId: string }>;
};

export default async function LocationDetailPage({
  params,
}: LocationDetailPageProps) {
  const session = await requireSession();
  const supabase = await createClient();
  const { locationId } = await params;
  const data = await getLocationDetailData(supabase, session, locationId);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <LocationDetailContent data={data} />
    </div>
  );
}
