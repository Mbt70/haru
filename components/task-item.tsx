"use client";

import type { Tables } from "@/lib/database.types";
import { dday, ddayDiff, formatShortDate } from "@/lib/dates";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Task = Tables<"tasks">;

export function TaskItem({
  task,
  onToggle,
  onSelect,
  onReschedule,
  onPlanToday,
}: {
  task: Task;
  onToggle: (task: Task, done: boolean) => void;
  onSelect?: (task: Task) => void;
  onReschedule?: (task: Task) => void;
  onPlanToday?: (task: Task) => void;
}) {
  const done = task.completed_at !== null;
  const overdue = !done && task.due_date !== null && ddayDiff(task.due_date) < 0;

  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-2.5">
      <Checkbox
        checked={done}
        onCheckedChange={(checked) => onToggle(task, checked === true)}
        aria-label={`${task.title} · ${done ? "미완료로 되돌리기" : "완료하기"}`}
      />
      <button
        type="button"
        className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
        onClick={() => onSelect?.(task)}
      >
        <span
          className={cn(
            "w-full truncate text-sm",
            done && "text-muted-foreground line-through",
          )}
        >
          {task.priority === 1 && !done && (
            <span className="mr-1.5 inline-block size-1.5 -translate-y-px rounded-full bg-destructive" />
          )}
          {task.title}
        </span>
        {task.due_date && !done && (
          <span className="flex items-center gap-1.5">
            <Badge
              variant={overdue ? "destructive" : "secondary"}
              className="px-1.5 py-0 text-[10px]"
            >
              {dday(task.due_date)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatShortDate(task.due_date)} 마감
            </span>
          </span>
        )}
      </button>
      {onPlanToday && !done && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs text-muted-foreground"
          onClick={() => onPlanToday(task)}
        >
          오늘로
        </Button>
      )}
      {onReschedule && !done && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs text-muted-foreground"
          onClick={() => onReschedule(task)}
        >
          내일로
        </Button>
      )}
    </li>
  );
}
