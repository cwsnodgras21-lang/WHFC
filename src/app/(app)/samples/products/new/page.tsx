import { SampleProductEditor } from "@/components/samples/sample-product-editor";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/error-state";
import { requireSession } from "@/lib/auth/session";
import { getSampleProductEditorData } from "@/lib/data/sample-products";
import { ModulePageGuard } from "@/lib/modules/guard";
import { createClient } from "@/lib/supabase/server";

export default async function NewSampleProductPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getSampleProductEditorData(supabase, session);

  return (
    <ModulePageGuard moduleKey="samples">
      <div className="space-y-6">
        <PageHeader title="New sample product" />
        {!data.canManage ? (
          <ErrorState
            title="Access denied"
            message={data.permissionMessage ?? "You cannot manage sample products."}
          />
        ) : data.loadError ? (
          <ErrorState title="Unable to load form data" message={data.loadError} />
        ) : (
          <SampleProductEditor data={data} />
        )}
      </div>
    </ModulePageGuard>
  );
}
