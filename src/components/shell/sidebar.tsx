"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import type { NavGroup } from "@/lib/navigation";
import { cn } from "@/lib/cn";

type SidebarProps = {
  groups: NavGroup[];
  mobileOpen: boolean;
  logoAvailable: boolean;
  onMobileClose: () => void;
};

export function Sidebar({
  groups,
  mobileOpen,
  logoAvailable,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();

  const nav = (
    <nav
      aria-label="Main navigation"
      className="flex flex-1 flex-col overflow-y-auto px-3 py-4"
    >
      {groups.map((group) => (
        <div key={group.id} className="nav-group">
          <p className="nav-group-label" id={`nav-group-${group.id}`}>
            {group.label}
          </p>
          <ul aria-labelledby={`nav-group-${group.id}`} className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onMobileClose}
                    aria-current={active ? "page" : undefined}
                    className={cn("nav-link", active && "nav-link-active")}
                  >
                    <Icon
                      className="nav-link-icon h-[1.125rem] w-[1.125rem]"
                      strokeWidth={active ? 2.25 : 1.75}
                      aria-hidden
                    />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-[var(--color-brand-charcoal)]/40 lg:hidden"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[15.5rem] flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar-bg)] transition-transform duration-200 ease-out lg:relative lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Retro four-color brand stripe along the far-left edge */}
        <span
          aria-hidden
          className="brand-stripe-y pointer-events-none absolute inset-y-0 left-0 w-1"
        />

        <div className="flex items-start justify-between gap-2 border-b border-[var(--color-border-subtle)] px-4 py-4 pl-5">
          <Link
            href="/dashboard"
            className="min-w-0 flex-1 cursor-pointer rounded-md outline-offset-2 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
            onClick={onMobileClose}
            aria-label="White House Family Care — Inventory Management, go to dashboard"
          >
            <BrandLogo variant="sidebar" logoAvailable={logoAvailable} />
          </Link>
          <button
            type="button"
            className="btn-icon shrink-0 lg:hidden"
            aria-label="Close menu"
            onClick={onMobileClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {nav}
      </aside>
    </>
  );
}
