import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  FileCheck,
  FileText,
  PackageMinus,
  ScanLine,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import type {
  TaskIconKey,
  TaskPriority,
  TodayTask,
} from "@/lib/dashboard/today-tasks";

const TASK_ICONS: Record<TaskIconKey, LucideIcon> = {
  expired: AlertTriangle,
  expiring: CalendarClock,
  count: ClipboardList,
  reorder: TrendingDown,
  "low-stock": PackageMinus,
  "po-approve": FileText,
  "imaging-appointment": CalendarDays,
  "imaging-auth": FileCheck,
  "imaging-overdue": ScanLine,
};

type PriorityBadgeVariant = "danger" | "warning" | "caution" | "info";

const PRIORITY_META: Record<
  TaskPriority,
  {
    label: string;
    badge: PriorityBadgeVariant;
    iconBg: string;
    iconColor: string;
  }
> = {
  critical: {
    label: "Critical",
    badge: "danger",
    iconBg: "var(--color-danger-bg)",
    iconColor: "var(--color-danger)",
  },
  high: {
    label: "High",
    badge: "warning",
    iconBg: "var(--color-attention-bg)",
    iconColor: "var(--color-attention)",
  },
  medium: {
    label: "Medium",
    badge: "caution",
    iconBg: "var(--color-caution-bg)",
    iconColor: "var(--color-caution)",
  },
  low: {
    label: "Low",
    badge: "info",
    iconBg: "var(--color-info-bg)",
    iconColor: "var(--color-info)",
  },
};

type TodayTasksCardProps = {
  tasks: TodayTask[];
};

export function TodayTasksCard({ tasks }: TodayTasksCardProps) {
  const hasTasks = tasks.length > 0;

  return (
    <section aria-labelledby="today-tasks-heading" className="panel">
      <div
        className={`panel-header ${hasTasks ? "panel-header-attention" : "panel-header-success"}`}
      >
        <h2 id="today-tasks-heading" className="section-heading">
          Action Center
        </h2>
        {hasTasks ? (
          <Badge variant="warning">{tasks.length} to do</Badge>
        ) : (
          <Badge variant="success">All caught up</Badge>
        )}
      </div>

      {hasTasks ? (
        <ul className="divide-y divide-[var(--color-border)]">
          {tasks.map((task) => {
            const Icon = TASK_ICONS[task.icon];
            const meta = PRIORITY_META[task.priority];

            return (
              <li
                key={task.id}
                className="flex flex-col gap-3 px-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    style={{ background: meta.iconBg, color: meta.iconColor }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <Badge variant={meta.badge}>{meta.label}</Badge>
                    <p className="font-medium text-[var(--color-fg)]">
                      {task.title}
                    </p>
                    <p className="text-sm text-[var(--color-fg-muted)]">
                      {task.description}
                    </p>
                  </div>
                </div>
                <div className="sm:pl-4">
                  <LinkButton href={task.href} variant="primary">
                    {task.ctaLabel}
                  </LinkButton>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="px-3 py-8 text-center">
          <p className="text-base font-medium text-[var(--color-fg)]">
            ✅ You&apos;re all caught up!
          </p>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            No operational tasks require attention today.
          </p>
        </div>
      )}
    </section>
  );
}
