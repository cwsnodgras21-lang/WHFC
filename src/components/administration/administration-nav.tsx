import Link from "next/link";

import { cn } from "@/lib/cn";

const ADMIN_LINKS: Array<{
  href: string;
  label: string;
  exact?: boolean;
}> = [
  { href: "/administration", label: "Overview", exact: true },
  { href: "/administration/categories", label: "Categories" },
  { href: "/administration/vendors", label: "Vendors" },
  { href: "/administration/units-of-measure", label: "Units of Measure" },
];

type AdministrationNavProps = {
  currentPath: string;
};

export function AdministrationNav({ currentPath }: AdministrationNavProps) {
  return (
    <nav aria-label="Administration" className="admin-tabs">
      {ADMIN_LINKS.map((link) => {
        const active = link.exact
          ? currentPath === link.href
          : currentPath === link.href ||
            currentPath.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn("admin-tab", active && "admin-tab-active")}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
