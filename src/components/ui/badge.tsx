import { badgeClass } from "@/lib/theme/variants";

type BadgeVariant =
  | "default"
  | "info"
  | "warning"
  | "caution"
  | "success"
  | "danger";

type BadgeProps = {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
};

export function Badge({
  variant = "default",
  className,
  children,
}: BadgeProps) {
  return (
    <span className={badgeClass(variant, className)}>{children}</span>
  );
}
