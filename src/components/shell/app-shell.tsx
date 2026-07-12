"use client";

import { useState } from "react";

import type { AppSession } from "@/lib/auth/session";
import { getNavGroupsForRole } from "@/lib/navigation";
import type { OrganizationModules } from "@/lib/modules/types";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

type AppShellProps = {
  session: AppSession;
  enabledModules: OrganizationModules;
  logoAvailable: boolean;
  children: React.ReactNode;
};

export function AppShell({
  session,
  enabledModules,
  logoAvailable,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navGroups = getNavGroupsForRole(session.profile.role, enabledModules);

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <Sidebar
        groups={navGroups}
        mobileOpen={mobileOpen}
        logoAvailable={logoAvailable}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          session={session}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto w-full max-w-6xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
