import { cn } from "@/lib/cn";

export const buttonVariants = {
  base: "btn",
  primary: "btn-primary",
  secondary: "btn-secondary",
  destructive: "btn-destructive",
  icon: "btn-icon",
} as const;

export const badgeVariants = {
  base: "badge",
  default: "badge-default",
  info: "badge-info",
  warning: "badge-warning",
  caution: "badge-caution",
  success: "badge-success",
  danger: "badge-danger",
} as const;

export function buttonClass(
  variant: keyof typeof buttonVariants = "base",
  className?: string
) {
  if (variant === "base") {
    return cn(buttonVariants.base, className);
  }
  return cn(buttonVariants.base, buttonVariants[variant], className);
}

export function badgeClass(
  variant: keyof typeof badgeVariants = "default",
  className?: string
) {
  if (variant === "base") {
    return cn(badgeVariants.base, className);
  }
  return cn(badgeVariants.base, badgeVariants[variant], className);
}
