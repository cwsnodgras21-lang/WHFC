"use client";

import { usePathname } from "next/navigation";

import { AdministrationNav } from "@/components/administration/administration-nav";

export function AdministrationNavClient() {
  const pathname = usePathname();
  return <AdministrationNav currentPath={pathname} />;
}
