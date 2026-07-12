import { cn } from "@/lib/cn";

type PageSectionProps = {
  title: string;
  id?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function PageSection({
  title,
  id,
  action,
  children,
  className,
}: PageSectionProps) {
  return (
    <section aria-labelledby={id} className={cn("page-section", className)}>
      <div className="section-heading-row">
        <h2 id={id} className="section-heading">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
