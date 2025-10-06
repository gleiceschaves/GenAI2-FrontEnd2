"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const variants = {
  info: "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-100",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100",
  warning: "bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100",
  error: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-200",
} as const;

type AlertVariant = keyof typeof variants;

interface AlertProps {
  title?: ReactNode;
  description?: ReactNode;
  variant?: AlertVariant;
  className?: string;
}

export function Alert({ title, description, variant = "info", className }: AlertProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-transparent px-4 py-3 text-sm",
        variants[variant],
        className,
      )}
    >
      {title ? <div className="font-medium">{title}</div> : null}
      {description ? <div className="mt-1 text-sm opacity-90">{description}</div> : null}
    </div>
  );
}
