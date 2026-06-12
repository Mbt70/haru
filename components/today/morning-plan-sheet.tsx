"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { emitDataChanged } from "@/lib/events";
import { dday, todayStr } from "@/lib/dates";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Task = Tables<"tasks">;
type DailyLog = Tables<"daily_logs">;

function PlanForm({
  log,
  onDone,
}: {
  log: DailyLog | null;
  onDone: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [focus, setFocus] = useState(log?.focus ?? "");
  const [candidates, setCandidates] = useState<Task[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [initialPlanned, setInitialPlanned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const t = todayStr();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .is("completed_at", null)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("priority")
        .order("created_at", { ascending: false });
      if (data) {
        // 지연된 마감을 맨 위로
        const sorted = [
          ...data.filter((x) => x.due_date && x.due_date < t),
          ...data.filter((x) => !x.due_date || x.due_date >= t),
        ];
        setCandidates(sorted);
        const planned = new Set(
          data.filter((x) => x.planned_for === t).map((x) => x.id),
        );
        setChecked(new Set(planned));
        setInitialPlanned(planned);
      }
      setLoading(false);
    })();
  }, [supabase, t]);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const { error: logError } = await supabase.from("daily_logs").upsert(
      {
        log_date: t,
        focus: focus.trim() || null,
        planned_at: new Date().toISOString(),
      },
      { onConflict: "user_id,log_date" },
    );
    if (logError) {
      setSaving(false);
      toast.error("저장에 실패했어요");
      return;
    }
    const toPlan = [...checked].filter((id) => !initialPlanned.has(id));
    const toUnplan = [...initialPlanned].filter((id) => !checked.has(id));
    if (toPlan.length > 0) {
      await supabase.from("tasks").update({ planned_for: t }).in("id", toPlan);
    }
    if (toUnplan.length > 0) {
      await supabase
        .from("tasks")
        .update({ planned_for: null })
        .in("id", toUnplan);
    }
    setSaving(false);
    toast.success("오늘 계획 완료!");
    emitDataChanged("tasks");
    emitDataChanged("daily_logs");
    onDone();
  }

  return (
    <div className="space-y-4 px-4">
      <div className="space-y-2">
        <Label htmlFor="focus">오늘의 포커스 한 줄</Label>
        <Input
          id="focus"
          autoFocus={!log?.focus}
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="예: 한이음 신청서 초안 끝내기"
        />
      </div>
      <div className="space-y-2">
        <Label>오늘 할 일 고르기 ({checked.size})</Label>
        {loading ? (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            할 일이 없어요. 먼저 + 버튼으로 추가해보세요.
          </p>
        ) : (
          <ul className="max-h-[40vh] space-y-0.5 overflow-y-auto pr-1">
            {candidates.map((task) => {
              const overdue = task.due_date && task.due_date < t;
              return (
                <li key={task.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2">
                    <Checkbox
                      checked={checked.has(task.id)}
                      onCheckedChange={() => toggle(task.id)}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {task.title}
                    </span>
                    {task.due_date && (
                      <Badge
                        variant={overdue ? "destructive" : "secondary"}
                        className={cn("shrink-0 px-1.5 py-0 text-[10px]")}
                      >
                        {dday(task.due_date)}
                      </Badge>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Button className="w-full" onClick={save} disabled={saving}>
        {log?.planned_at ? "계획 수정" : "오늘 시작하기"}
      </Button>
    </div>
  );
}

export function MorningPlanSheet({
  open,
  onOpenChange,
  log,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: DailyLog | null;
  onSaved: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1rem)]"
      >
        <SheetHeader>
          <SheetTitle>오늘 계획</SheetTitle>
          <SheetDescription>
            너무 많이 고르지 마세요 — 3개면 충분해요
          </SheetDescription>
        </SheetHeader>
        {open && (
          <PlanForm
            log={log}
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
