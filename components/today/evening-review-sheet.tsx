"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { emitDataChanged } from "@/lib/events";
import { tomorrowStr } from "@/lib/dates";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Task = Tables<"tasks">;
type DailyLog = Tables<"daily_logs">;

function ReviewForm({
  log,
  doneTasks,
  leftoverTasks,
  aiSessionCount,
  onDone,
}: {
  log: DailyLog;
  doneTasks: Task[];
  leftoverTasks: Task[];
  aiSessionCount: number;
  onDone: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [reflection, setReflection] = useState(log.reflection ?? "");
  const [leftovers, setLeftovers] = useState(leftoverTasks);
  const [saving, setSaving] = useState(false);

  async function triage(task: Task, action: "tomorrow" | "unplan") {
    const planned_for = action === "tomorrow" ? tomorrowStr() : null;
    const { error } = await supabase
      .from("tasks")
      .update({ planned_for })
      .eq("id", task.id);
    if (error) {
      toast.error("변경에 실패했어요");
      return;
    }
    setLeftovers((prev) => prev.filter((x) => x.id !== task.id));
    emitDataChanged("tasks");
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("daily_logs")
      .update({
        reflection: reflection.trim() || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", log.id);
    setSaving(false);
    if (error) {
      toast.error("저장에 실패했어요");
      return;
    }
    toast.success("오늘 하루 수고했어요!");
    emitDataChanged("daily_logs");
    onDone();
  }

  return (
    <div className="space-y-5 px-4">
      <div className="space-y-1.5">
        <Label>완료한 일 {doneTasks.length}</Label>
        {doneTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            완료한 일이 없어요. 그런 날도 있죠.
          </p>
        ) : (
          <ul className="space-y-1">
            {doneTasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
                <span className="truncate">{task.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {leftovers.length > 0 && (
        <div className="space-y-1.5">
          <Label>못 끝낸 계획 {leftovers.length}</Label>
          <ul className="space-y-1.5">
            {leftovers.map((task) => (
              <li key={task.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm">
                  {task.title}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => triage(task, "tomorrow")}
                >
                  내일로
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => triage(task, "unplan")}
                >
                  해제
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {aiSessionCount > 0 && (
        <p className="text-sm text-muted-foreground">
          오늘 AI 세션 {aiSessionCount}회
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="reflection">오늘 회고</Label>
        <Textarea
          id="reflection"
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={3}
          placeholder="어땠나요? 내일의 나에게 남길 말 한마디"
        />
      </div>

      <Button className="w-full" onClick={save} disabled={saving}>
        오늘 마감
      </Button>
    </div>
  );
}

export function EveningReviewSheet({
  open,
  onOpenChange,
  log,
  doneTasks,
  leftoverTasks,
  aiSessionCount = 0,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: DailyLog | null;
  doneTasks: Task[];
  leftoverTasks: Task[];
  aiSessionCount?: number;
  onSaved: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1rem)]"
      >
        <SheetHeader>
          <SheetTitle>하루 마무리</SheetTitle>
        </SheetHeader>
        {open && log && (
          <ReviewForm
            log={log}
            doneTasks={doneTasks}
            leftoverTasks={leftoverTasks}
            aiSessionCount={aiSessionCount}
            onDone={() => {
              onOpenChange(false);
              onSaved();
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
