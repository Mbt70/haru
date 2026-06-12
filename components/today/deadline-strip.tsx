"use client";

import Link from "next/link";
import { dday, formatShortDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, ChevronRight } from "lucide-react";

export type DeadlineItem = {
  id: string;
  kind: "task" | "milestone";
  title: string;
  date: string;
  context?: string | null; // 마일스톤이면 목표 이름
};

export function DeadlineStrip({ items }: { items: DeadlineItem[] }) {
  if (items.length === 0) return null;
  return (
    <Link
      href="/tasks?tab=agenda"
      className="block rounded-xl border px-4 py-3 transition-colors hover:bg-accent/50"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <CalendarClock className="size-3.5" />
          다가오는 마감
        </p>
        <ChevronRight className="size-3.5 text-muted-foreground" />
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`} className="flex items-center gap-2">
            <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
              {dday(item.date)}
            </Badge>
            <span className="min-w-0 flex-1 truncate text-sm">
              {item.context ? `${item.context} · ` : ""}
              {item.title}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatShortDate(item.date)}
            </span>
          </li>
        ))}
      </ul>
    </Link>
  );
}
