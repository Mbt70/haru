"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { emitDataChanged } from "@/lib/events";
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

type Routine = Tables<"routines">;

const PRIORITIES = [
  { value: 1, label: "높음" },
  { value: 2, label: "보통" },
  { value: 3, label: "낮음" },
] as const;

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function RoutineForm({
  routine,
  onDone,
}: {
  routine: Routine | null;
  onDone: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [title, setTitle] = useState(routine?.title ?? "");
  const [freq, setFreq] = useState<string>(routine?.freq ?? "daily");
  const [weekdays, setWeekdays] = useState<number[]>(routine?.weekdays ?? []);
  const [priority, setPriority] = useState(routine?.priority ?? 2);
  const [notes, setNotes] = useState(routine?.notes ?? "");
  const [goalId, setGoalId] = useState(routine?.goal_id ?? "none");
  const [active, setActive] = useState(routine?.active ?? true);
  const [goals, setGoals] = useState<{ id: string; title: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  function toggleDay(d: number) {
    setWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  async function save() {
    const t = title.trim();
    if (!t) {
      toast.error("이름을 입력해주세요");
      return;
    }
    if (freq === "weekly" && weekdays.length === 0) {
      toast.error("요일을 골라주세요");
      return;
    }
    setSaving(true);
    const payload = {
      title: t,
      freq,
      weekdays: freq === "weekly" ? weekdays : null,
      priority,
      notes: notes.trim() || null,
      goal_id: goalId === "none" ? null : goalId,
      active,
    };
    const { error } = routine
      ? await supabase.from("routines").update(payload).eq("id", routine.id)
      : await supabase.from("routines").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("저장에 실패했어요");
      return;
    }
    emitDataChanged("routines");
    onDone();
  }

  async function remove() {
    if (!routine) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const { error } = await supabase
      .from("routines")
      .delete()
      .eq("id", routine.id);
    if (error) {
      toast.error("삭제에 실패했어요");
      return;
    }
    toast("루틴을 삭제했어요 (이미 만들어진 할 일은 남아요)");
    emitDataChanged("routines");
    onDone();
  }

  return (
    <div className="space-y-4 px-4">
      <div className="space-y-2">
        <Label htmlFor="routine-title">이름</Label>
        <Input
          id="routine-title"
          autoFocus={!routine}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 저녁 회고 쓰기"
        />
      </div>
      <div className="space-y-2">
        <Label>반복</Label>
        <div className="flex gap-2">
          <Chip selected={freq === "daily"} onClick={() => setFreq("daily")}>
            매일
          </Chip>
          <Chip selected={freq === "weekly"} onClick={() => setFreq("weekly")}>
            매주
          </Chip>
        </div>
      </div>
      {freq === "weekly" && (
        <div className="space-y-2">
          <Label>요일</Label>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((label, d) => (
              <Chip
                key={d}
                selected={weekdays.includes(d)}
                onClick={() => toggleDay(d)}
              >
                {label}
              </Chip>
            ))}
          </div>
        </div>
      )}
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
          <Label>목표 (선택)</Label>
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
      <div className="space-y-2">
        <Label htmlFor="routine-notes">메모</Label>
        <Textarea
          id="routine-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="필요하면"
        />
      </div>
      {routine && (
        <div className="flex items-center gap-2">
          <Chip selected={active} onClick={() => setActive(!active)}>
            {active ? "켜짐" : "꺼짐"}
          </Chip>
          <span className="text-xs text-muted-foreground">
            끄면 새 할 일을 만들지 않아요
          </span>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        {routine && (
          <Button variant="ghost" className="text-destructive" onClick={remove}>
            {confirmDelete ? "정말 삭제" : "삭제"}
          </Button>
        )}
        <Button className="flex-1" onClick={save} disabled={saving}>
          저장
        </Button>
      </div>
    </div>
  );
}

export function RoutineFormSheet({
  routine,
  open,
  onOpenChange,
}: {
  routine: Routine | null;
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
          <SheetTitle>{routine ? "루틴 편집" : "새 루틴"}</SheetTitle>
        </SheetHeader>
        {open && (
          <RoutineForm
            key={routine?.id ?? "new"}
            routine={routine}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
