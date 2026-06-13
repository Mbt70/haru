"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { emitDataChanged } from "@/lib/events";
import { dday, ddayDiff } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Milestone = Tables<"milestones">;

export function MilestoneList({
  goalId,
  milestones,
  onChanged,
}: {
  goalId: string;
  milestones: Milestone[];
  onChanged: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDue, setEditDue] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const t = newTitle.trim();
    if (!t) return;
    const maxOrder = Math.max(0, ...milestones.map((m) => m.sort_order));
    const { error } = await supabase.from("milestones").insert({
      goal_id: goalId,
      title: t,
      due_date: newDue || null,
      sort_order: maxOrder + 1,
    });
    if (error) {
      toast.error("추가에 실패했어요");
      return;
    }
    setNewTitle("");
    setNewDue("");
    emitDataChanged("milestones");
    onChanged();
  }

  async function toggle(m: Milestone, done: boolean) {
    const { error } = await supabase
      .from("milestones")
      .update({ completed_at: done ? new Date().toISOString() : null })
      .eq("id", m.id);
    if (error) {
      toast.error("변경에 실패했어요");
      return;
    }
    emitDataChanged("milestones");
    onChanged();
  }

  function startEdit(m: Milestone) {
    setEditingId(m.id);
    setEditTitle(m.title);
    setEditDue(m.due_date ?? "");
  }

  async function saveEdit() {
    const t = editTitle.trim();
    if (!t || !editingId) return;
    const { error } = await supabase
      .from("milestones")
      .update({ title: t, due_date: editDue || null })
      .eq("id", editingId);
    if (error) {
      toast.error("저장에 실패했어요");
      return;
    }
    setEditingId(null);
    emitDataChanged("milestones");
    onChanged();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("milestones").delete().eq("id", id);
    if (error) {
      toast.error("삭제에 실패했어요");
      return;
    }
    setEditingId(null);
    emitDataChanged("milestones");
    onChanged();
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-0.5">
        {milestones.map((m) => {
          const done = m.completed_at !== null;
          const overdue = !done && m.due_date && ddayDiff(m.due_date) < 0;
          return (
            <li key={m.id}>
              {editingId === m.id ? (
                <div className="space-y-2 rounded-lg border p-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={editDue}
                      onChange={(e) => setEditDue(e.target.value)}
                    />
                    <Button size="sm" onClick={saveEdit}>
                      저장
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => remove(m.id)}
                    >
                      삭제
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      aria-label="취소"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                  <Checkbox
                    checked={done}
                    onCheckedChange={(checked) => toggle(m, checked === true)}
                    aria-label={`${m.title} · ${done ? "미완료로 되돌리기" : "완료하기"}`}
                  />
                  <button
                    type="button"
                    onClick={() => startEdit(m)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span
                      className={cn(
                        "truncate text-sm",
                        done && "text-muted-foreground line-through",
                      )}
                    >
                      {m.title}
                    </span>
                    {m.due_date && !done && (
                      <Badge
                        variant={overdue ? "destructive" : "secondary"}
                        className="shrink-0 px-1.5 py-0 text-[10px]"
                      >
                        {dday(m.due_date)}
                      </Badge>
                    )}
                  </button>
                </div>
              )}
            </li>
          );
        })}
        {milestones.length === 0 && (
          <p className="px-2 text-sm text-muted-foreground">
            마일스톤으로 목표를 쪼개보세요. 대회라면 접수·제출·발표 마감부터.
          </p>
        )}
      </ul>
      <form onSubmit={add} className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="마일스톤 추가..."
        />
        <Input
          type="date"
          value={newDue}
          onChange={(e) => setNewDue(e.target.value)}
          className="w-36 shrink-0"
        />
        <Button type="submit" size="icon" aria-label="추가" className="shrink-0">
          <Plus className="size-4" />
        </Button>
      </form>
    </div>
  );
}
