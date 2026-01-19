"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-2 text-sm", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span
            key={`${item.label}-${index}`}
            className={cn("flex items-center gap-2", isLast ? "text-slate-500 dark:text-slate-400" : "text-slate-700 dark:text-slate-200")}
          >
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="transition-colors hover:text-slate-900 dark:hover:text-slate-100"
              >
                {item.label}
              </Link>
            ) : (
              <span>{item.label}</span>
            )}
            {!isLast ? <ChevronRight className="h-3.5 w-3.5 text-slate-400" /> : null}
          </span>
        );
      })}
    </nav>
  );
}
