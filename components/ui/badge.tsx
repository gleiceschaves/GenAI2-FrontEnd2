"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
  secondary: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  destructive: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100",
  ghost:
    "bg-transparent text-slate-600 ring-1 ring-inset ring-slate-200 dark:text-slate-300 dark:ring-slate-700",
} as const;

type BadgeVariant = keyof typeof variants;

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
