"use client";

import { Menu, MessageSquarePlus } from "lucide-react";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/lib/auth/actions";
import type { AppSession } from "@/lib/auth/session";
import { getNavLabelForPath, ROLE_LABELS } from "@/lib/navigation";
import { Button } from "@/components/ui/button";

type TopbarProps = {
  session: AppSession;
  onMenuClick: () => void;
  onFeedbackClick: () => void;
};

export function Topbar({ session, onMenuClick, onFeedbackClick }: TopbarProps) {
  const pathname = usePathname();
  const pageLabel = getNavLabelForPath(pathname);
  const displayName =
    session.profile.full_name?.trim() ||
    session.user.email ||
    "Signed-in user";

  return (
    <header className="sticky top-0 z-30 flex flex-col bg-[var(--color-surface)]">
      <div className="flex h-[3.75rem] shrink-0 items-center gap-3 px-4 py-2.5 sm:px-6">
        <button
          type="button"
          className="btn-icon lg:hidden"
          aria-label="Open navigation menu"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate font-[family-name:var(--font-heading)] text-base font-bold text-[var(--color-fg)]">
            {pageLabel}
          </p>
        </div>

        <div className="hidden min-w-0 text-right sm:block">
          <p className="truncate text-sm font-semibold text-[var(--color-fg)]">
            {displayName}
          </p>
          <p className="truncate text-xs text-[var(--color-fg-muted)]">
            {ROLE_LABELS[session.profile.role]}
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="shrink-0"
          onClick={onFeedbackClick}
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Feedback</span>
          <span className="sr-only sm:hidden">Send feedback</span>
        </Button>

        <form action={logoutAction}>
          <Button type="submit" variant="secondary" className="shrink-0">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
