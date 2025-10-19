"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps extends ButtonProps {
  fallbackHref: string;
  label?: string;
}

export function BackButton({
  fallbackHref,
  label = "Back",
  className,
  onClick,
  ...props
}: BackButtonProps) {
  const router = useRouter();

  const handleClick: ButtonProps["onClick"] = (event) => {
    onClick?.(event);
    if (!event.defaultPrevented) {
      router.push(fallbackHref);
    }
  };

  return (
    <Button
      variant="ghost"
      type="button"
      onClick={handleClick}
      className={cn("w-fit", className)}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
