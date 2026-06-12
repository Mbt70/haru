"use client";

import { cn } from "@/lib/utils";

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
