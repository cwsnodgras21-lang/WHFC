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
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <table className={cn("data-table", className)}>{children}</table>;
}
