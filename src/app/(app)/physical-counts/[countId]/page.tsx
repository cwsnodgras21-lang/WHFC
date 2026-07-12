import { PhysicalCountDetailContent } from "@/components/physical-counts/physical-count-detail-content";
import { requireSession } from "@/lib/auth/session";
import { getPhysicalCountDetailData } from "@/lib/data/physical-counts";
import { createClient } from "@/lib/supabase/server";

type PhysicalCountDetailPageProps = {
  params: Promise<{ countId: string }>;
};

export default async function PhysicalCountDetailPage({
  params,
}: PhysicalCountDetailPageProps) {
  const { countId } = await params;
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getPhysicalCountDetailData(supabase, session, countId);

  return <PhysicalCountDetailContent data={data} />;
}
