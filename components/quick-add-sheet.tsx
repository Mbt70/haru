"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { emitDataChanged } from "@/lib/events";
import { todayStr, tomorrowStr } from "@/lib/dates";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chip } from "@/components/chip";
import { toast } from "sonner";

const PRIORITIES = [
  { value: 1, label: "높음" },
  { value: 2, label: "보통" },
  { value: 3, label: "낮음" },
] as const;

// 시트가 닫히면 폼이 언마운트되므로 열릴 때마다 자연스럽게 빈 상태에서 시작
function AddTaskForm({ onClose }: { onClose: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState<"" | "today" | "tomorrow">("");
  const [showDue, setShowDue] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState(2);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      title: t,
      planned_for:
        when === "today"
          ? todayStr()
          : when === "tomorrow"
            ? tomorrowStr()
            : null,
      due_date: dueDate || null,
      priority,
    });
    setSaving(false);
    if (error) {
      toast.error("저장에 실패했어요");
      return;
    }
    toast.success("추가했어요");
    emitDataChanged("tasks");
    onClose();
  }

  return (
    <form onSubmit={save} className="space-y-4 px-4">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="무엇을 해야 하나요?"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Chip
          selected={when === "today"}
          onClick={() => setWhen(when === "today" ? "" : "today")}
        >
          오늘
        </Chip>
        <Chip
          selected={when === "tomorrow"}
          onClick={() => setWhen(when === "tomorrow" ? "" : "tomorrow")}
        >
          내일
        </Chip>
        <Chip
          selected={showDue}
          onClick={() => {
            setShowDue(!showDue);
            if (showDue) setDueDate("");
          }}
        >
          마감일...
        </Chip>
      </div>
      {showDue && (
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      )}
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
      <Button type="submit" className="w-full" disabled={saving || !title.trim()}>
        추가
      </Button>
    </form>
  );
}

export function QuickAddSheet({
  open,
  onOpenChange,
}: {
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
          <SheetTitle>할 일 추가</SheetTitle>
        </SheetHeader>
        <AddTaskForm onClose={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
