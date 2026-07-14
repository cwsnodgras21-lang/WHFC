import { cn } from "@/lib/cn";

type DataTableProps = {
  children: React.ReactNode;
  className?: string;
};

export function DataTableShell({ children, className }: DataTableProps) {
  return <div className={cn("table-shell", className)}>{children}</div>;
}

export function DataTable({
  children,
  className,
  responsive = false,
}: {
  children: React.ReactNode;
  className?: string;
  /**
   * When true, rows stack into labeled cards under 40rem. Pair with
   * `data-label="Column"` on each `<td>` (use `data-label=""` for action cells).
   */
  responsive?: boolean;
}) {
  return (
    <table
      className={cn(
        "data-table",
        responsive && "data-table-responsive",
        className
      )}
    >
      {children}
    </table>
  );
}
