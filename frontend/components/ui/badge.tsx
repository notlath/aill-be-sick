import * as React from "react";
import { cn } from "@/utils/lib";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const variantClass: Record<BadgeVariant, string> = {
  // Apple-style badges with subtle styling
  default: "bg-primary/10 text-primary border-primary/20",
  secondary: "bg-secondary/10 text-secondary border-secondary/20",
  destructive: "bg-red-500/10 text-red-600 border-red-500/20",
  outline: "bg-base-200/50 text-base-content/70 border-base-300/50",
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-all duration-300 hover:scale-105",
        variantClass[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
