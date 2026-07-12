import { CategoriesPageContent } from "@/components/categories/categories-page-content";
import { getCategoriesPageData } from "@/lib/data/categories-page";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function CategoriesPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getCategoriesPageData(supabase, session);
  return <CategoriesPageContent data={data} />;
}
