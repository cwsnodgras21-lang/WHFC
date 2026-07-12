import { AdministrationNavClient } from "@/components/administration/administration-nav-client";
import { canAccessAdministration } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AdministrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  if (!canAccessAdministration(session.profile.role, session.profile.active)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <AdministrationNavClient />
      {children}
    </div>
  );
}
