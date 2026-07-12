import Link from "next/link";

import { ModulesSettingsForm } from "@/components/admin/modules-settings-form";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import type { AdminModulesPageData } from "@/lib/data/admin-modules-page";

type AdminModulesPageContentProps = {
  data: AdminModulesPageData;
};

export function AdminModulesPageContent({ data }: AdminModulesPageContentProps) {
  if (!data.canManage) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Module settings"
          description="Enable or disable broad product capabilities for this organization."
        />
        <ErrorState
          title="Access denied"
          message={
            data.permissionMessage ??
            "Only administrators can manage module settings."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Module settings"
        description="Turn broad capabilities on or off for a simpler daily experience. Disabled modules stay in the codebase but are hidden from navigation and blocked when accessed directly."
        actions={
          <Link href="/administration" className="btn btn-secondary">
            Administration
          </Link>
        }
      />

      {data.loadError ? (
        <ErrorState
          title="Some settings could not be loaded"
          message={data.loadError}
        />
      ) : null}

      <ModulesSettingsForm initialModules={data.modules} />
    </div>
  );
}
