import { cn } from "@/lib/cn";

type AlertVariant = "success" | "error" | "warning" | "info";

type AlertProps = {
  variant?: AlertVariant;
  title?: string;
  message: string;
  className?: string;
};

const variantClass: Record<AlertVariant, string> = {
  success: "alert alert-success",
  error: "alert alert-error",
  warning: "alert alert-warning",
  info: "alert alert-info",
};

export function Alert({
  variant = "error",
  title,
  message,
  className,
}: AlertProps) {
  return (
    <div role="alert" className={cn(variantClass[variant], className)}>
      <span aria-hidden className="alert-accent" />
      <div className="alert-content">
        {title ? <p className="alert-title">{title}</p> : null}
        <p className={title ? "alert-body" : undefined}>{message}</p>
      </div>
    </div>
  );
}
