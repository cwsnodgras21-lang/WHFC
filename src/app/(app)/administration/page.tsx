import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { canManageModuleSettings } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export default async function AdministrationPage() {
  const session = await requireSession();
  const showModuleSettings = canManageModuleSettings(
    session.profile.role,
    session.profile.active
  );

  const cards = [
    {
      href: "/administration/categories",
      title: "Categories",
      description: "Organize items by supply category.",
    },
    {
      href: "/administration/vendors",
      title: "Vendors",
      description: "Maintain preferred vendor contacts.",
    },
    {
      href: "/administration/units-of-measure",
      title: "Units of measure",
      description: "Define stocking units for items.",
    },
    ...(showModuleSettings
      ? [
          {
            href: "/admin/modules",
            title: "Module settings",
            description:
              "Turn features on or off for a simpler daily experience.",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration"
        description="Manage reference data used by the item catalog and inventory workflows."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="card card-body transition-colors hover:border-[var(--color-primary)]"
          >
            <h2 className="section-heading">{card.title}</h2>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
