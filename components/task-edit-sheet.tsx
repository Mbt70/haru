"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { emitDataChanged } from "@/lib/events";
import { todayStr, tomorrowStr } from "@/lib/dates";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Chip } from "@/components/chip";
import { toast } from "sonner";

type Task = Tables<"tasks">;

const PRIORITIES = [
  { value: 1, label: "높음" },
  { value: 2, label: "보통" },
  { value: 3, label: "낮음" },
] as const;

// 시트가 닫히면 Radix가 내용을 언마운트하므로, 폼 상태는 props 초기값으로
// 시작하면 된다 (동기화 effect 불필요 — react.dev "resetting state with a key")
function EditForm({ task, onClose }: { task: Task; onClose: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [plannedFor, setPlannedFor] = useState(task.planned_for ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [goalId, setGoalId] = useState(task.goal_id ?? "none");
  const [goals, setGoals] = useState<{ id: string; title: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("goals")
        .select("id, title")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (data) setGoals(data);
    })();
  }, [supabase]);

  async function save() {
    const t = title.trim();
    if (!t) {
      toast.error("제목을 입력해주세요");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("tasks")
      .update({
        title: t,
        notes: notes.trim() || null,
        due_date: dueDate || null,
        planned_for: plannedFor || null,
        priority,
        goal_id: goalId === "none" ? null : goalId,
      })
      .eq("id", task.id);
    setSaving(false);
    if (error) {
      toast.error("저장에 실패했어요");
      return;
    }
    emitDataChanged("tasks");
    onClose();
  }

  async function remove() {
    const snapshot = task; // 실행취소용 원본 스냅샷
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) {
      toast.error("삭제에 실패했어요");
      return;
    }
    emitDataChanged("tasks");
    onClose();
    toast("삭제했어요", {
      action: {
        label: "취소",
        onClick: async () => {
          // 같은 id로 되살린다 (user_id는 default auth.uid())
          const { error: undoError } = await supabase.from("tasks").insert({
            id: snapshot.id,
            title: snapshot.title,
            notes: snapshot.notes,
            due_date: snapshot.due_date,
            planned_for: snapshot.planned_for,
            priority: snapshot.priority,
            completed_at: snapshot.completed_at,
            created_at: snapshot.created_at,
            goal_id: snapshot.goal_id,
          });
          if (undoError) {
            toast.error("되돌리지 못했어요");
            return;
          }
          emitDataChanged("tasks");
        },
      },
    });
  }

  return (
    <div className="space-y-4 px-4">
      <div className="space-y-2">
        <Label htmlFor="edit-title">제목</Label>
        <Input
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-notes">메모</Label>
        <Textarea
          id="edit-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="필요하면 적어두기"
        />
      </div>
      <div className="space-y-2">
        <Label>하기로 한 날</Label>
        <div className="flex flex-wrap gap-2">
          <Chip
            selected={plannedFor === todayStr()}
            onClick={() =>
              setPlannedFor(plannedFor === todayStr() ? "" : todayStr())
            }
          >
            오늘
          </Chip>
          <Chip
            selected={plannedFor === tomorrowStr()}
            onClick={() =>
              setPlannedFor(plannedFor === tomorrowStr() ? "" : tomorrowStr())
            }
          >
            내일
          </Chip>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-due">마감일</Label>
        <Input
          id="edit-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>우선순위</Label>
        <div className="flex gap-2">
          {PRIORITIES.map((p) => (
            <Chip
              key={p.value}
              selected={priority === p.value}
              onClick={() => setPriority(p.value)}
            >
              {p.label}
            </Chip>
          ))}
        </div>
      </div>
      {goals.length > 0 && (
        <div className="space-y-2">
          <Label>목표</Label>
          <Select value={goalId} onValueChange={setGoalId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="목표 없음" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">목표 없음</SelectItem>
              {goals.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button variant="ghost" className="text-destructive" onClick={remove}>
          삭제
        </Button>
        <Button className="flex-1" onClick={save} disabled={saving}>
          저장
        </Button>
      </div>
    </div>
  );
}

export function TaskEditSheet({
  task,
  open,
  onOpenChange,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1rem)]"
      >
        <SheetHeader>
          <SheetTitle>할 일 편집</SheetTitle>
        </SheetHeader>
        {task && (
          <EditForm
            key={task.id}
            task={task}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
