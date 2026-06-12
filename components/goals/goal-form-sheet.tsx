"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { emitDataChanged } from "@/lib/events";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Chip } from "@/components/chip";
import { toast } from "sonner";

type Goal = Tables<"goals">;

const CATEGORIES = ["공모전", "스킬", "기타"] as const;
const STATUSES = [
  { value: "active", label: "진행 중" },
  { value: "completed", label: "완료" },
  { value: "archived", label: "보관" },
] as const;

function GoalForm({ goal, onDone }: { goal: Goal | null; onDone: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [title, setTitle] = useState(goal?.title ?? "");
  const [category, setCategory] = useState(goal?.category ?? "공모전");
  const [targetDate, setTargetDate] = useState(goal?.target_date ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [status, setStatus] = useState(goal?.status ?? "active");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    const t = title.trim();
    if (!t) {
      toast.error("목표 이름을 입력해주세요");
      return;
    }
    setSaving(true);
    const payload = {
      title: t,
      category,
      target_date: targetDate || null,
      description: description.trim() || null,
      status,
    };
    const { error } = goal
      ? await supabase.from("goals").update(payload).eq("id", goal.id)
      : await supabase.from("goals").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("저장에 실패했어요");
      return;
    }
    emitDataChanged("goals");
    onDone();
  }

  async function remove() {
    if (!goal) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const { error } = await supabase.from("goals").delete().eq("id", goal.id);
    if (error) {
      toast.error("삭제에 실패했어요");
      return;
    }
    toast("목표를 삭제했어요 (할 일은 남아있어요)");
    emitDataChanged("goals");
    emitDataChanged("tasks");
    onDone();
    router.push("/goals");
  }

  return (
    <div className="space-y-4 px-4">
      <div className="space-y-2">
        <Label htmlFor="goal-title">목표</Label>
        <Input
          id="goal-title"
          autoFocus={!goal}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 한이음 2026 입상"
        />
      </div>
      <div className="space-y-2">
        <Label>분류</Label>
        <div className="flex gap-2">
          {CATEGORIES.map((c) => (
            <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="goal-target">목표일</Label>
        <Input
          id="goal-target"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="goal-desc">메모</Label>
        <Textarea
          id="goal-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="왜 이 목표인가요?"
        />
      </div>
      {goal && (
        <div className="space-y-2">
          <Label>상태</Label>
          <div className="flex gap-2">
            {STATUSES.map((s) => (
              <Chip
                key={s.value}
                selected={status === s.value}
                onClick={() => setStatus(s.value)}
              >
                {s.label}
              </Chip>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        {goal && (
          <Button
            variant="ghost"
            className="text-destructive"
            onClick={remove}
          >
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

export function GoalFormSheet({
  goal,
  open,
  onOpenChange,
}: {
  goal: Goal | null;
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
          <SheetTitle>{goal ? "목표 편집" : "새 목표"}</SheetTitle>
        </SheetHeader>
        {open && (
          <GoalForm
            key={goal?.id ?? "new"}
            goal={goal}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
