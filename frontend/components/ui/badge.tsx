import * as React from "react";
import { cn } from "@/utils/lib";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const variantClass: Record<BadgeVariant, string> = {
  // DaisyUI badge styles
  default: "badge badge-primary",
  secondary: "badge badge-secondary",
  destructive: "badge badge-error",
  outline: "badge badge-outline",
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return <div className={cn(variantClass[variant], className)} {...props} />;
}

export { Badge };
