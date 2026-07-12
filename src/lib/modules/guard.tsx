import { ModuleDisabledState } from "@/components/modules/module-disabled-state";
import { isModuleEnabled } from "@/lib/modules/definitions";
import { getOrganizationModules } from "@/lib/modules/fetch";
import type { ModuleKey } from "@/lib/modules/types";

type ModulePageGuardProps = {
  moduleKey: ModuleKey;
  children: React.ReactNode;
};

export async function ModulePageGuard({
  moduleKey,
  children,
}: ModulePageGuardProps) {
  const modules = await getOrganizationModules();

  if (!isModuleEnabled(modules, moduleKey)) {
    return <ModuleDisabledState moduleKey={moduleKey} />;
  }

  return <>{children}</>;
}
