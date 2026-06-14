"use client";

import Link from "next/link";
import type { Tables } from "@/lib/database.types";
import { dday, formatRelativeDay } from "@/lib/dates";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export type GoalWithMilestones = Tables<"goals"> & {
  milestones: { id: string; completed_at: string | null }[];
};

export function GoalCard({
  goal,
  lastTouched,
}: {
  goal: GoalWithMilestones;
  lastTouched?: string | null;
}) {
  const total = goal.milestones.length;
  const done = goal.milestones.filter((m) => m.completed_at !== null).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <Link href={`/goals/${goal.id}`} className="block">
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="space-y-2.5 py-4">
          <div className="flex items-center gap-2">
            {goal.category && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                {goal.category}
              </Badge>
            )}
            {goal.target_date && goal.status === "active" && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                {dday(goal.target_date)}
              </Badge>
            )}
            {goal.status !== "active" && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                {goal.status === "completed" ? "완료" : "보관"}
              </Badge>
            )}
          </div>
          <p className="font-medium">{goal.title}</p>
          <div className="flex items-center gap-3">
            <Progress value={pct} className="h-1.5 flex-1" />
            <span className="shrink-0 text-xs text-muted-foreground">
              {done}/{total}
            </span>
          </div>
          {lastTouched && (
            <p className="text-[11px] text-muted-foreground">
              마지막 작업: {formatRelativeDay(lastTouched)}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
