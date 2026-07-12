import { cn } from "@/lib/cn";

type PageHeaderProps = {
  title: string;
  description?: string;
  /** Optional small label above the title. Off by default — avoid label clutter. */
  eyebrow?: string;
  /** Optional primary action(s) aligned to the right of the heading. */
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("page-header", className)}>
      <div className="page-header-text">
        {eyebrow ? <p className="page-header-eyebrow">{eyebrow}</p> : null}
        <h1 className="page-header-title">{title}</h1>
        {description ? <p className="page-header-desc">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
