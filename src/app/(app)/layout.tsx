import { AppShell } from "@/components/shell/app-shell";
import { requireSession } from "@/lib/auth/session";
import { brandLogoFileExists } from "@/lib/brand/logo";
import { getOrganizationModules } from "@/lib/modules/fetch";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, enabledModules, logoAvailable] = await Promise.all([
    requireSession(),
    getOrganizationModules(),
    Promise.resolve(brandLogoFileExists()),
  ]);

  return (
    <AppShell
      session={session}
      enabledModules={enabledModules}
      logoAvailable={logoAvailable}
    >
      {children}
    </AppShell>
  );
}
