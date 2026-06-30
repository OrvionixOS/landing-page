import * as React from "react";

import { cn } from "@/lib/utils";

const variantClasses = {
  danger: "border-danger/20 bg-danger-soft text-danger",
  success: "border-success/20 bg-success-soft text-success",
  info: "border-accent/20 bg-accent-soft text-accent",
} as const;

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantClasses;
}

export function Alert({ className, variant = "info", ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border px-4 py-3 text-sm",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
