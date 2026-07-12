import { VendorsPageContent } from "@/components/vendors/vendors-page-content";
import { getVendorsPageData } from "@/lib/data/vendors-page";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function VendorsPage() {
  const session = await requireSession();
  const supabase = await createClient();
  return <VendorsPageContent data={await getVendorsPageData(supabase, session)} />;
}
