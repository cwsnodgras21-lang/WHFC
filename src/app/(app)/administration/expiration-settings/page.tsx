import { ExpirationSettingsForm } from "@/components/administration/expiration-settings-form";
import { requireSession } from "@/lib/auth/session";
import { getExpirationSettingsPageData } from "@/lib/data/expiration-settings-page";
import { createClient } from "@/lib/supabase/server";

export default async function ExpirationSettingsPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getExpirationSettingsPageData(supabase, session);

  return <ExpirationSettingsForm data={data} />;
}
