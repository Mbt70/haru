"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { dayRange, formatDateHeader, todayStr } from "@/lib/dates";
import { useDataChanged } from "@/lib/events";
import { TaskItem } from "@/components/task-item";
import { TaskEditSheet } from "@/components/task-edit-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Plus } from "lucide-react";
import { toast } from "sonner";

type Task = Tables<"tasks">;

export default function TodayPage() {
  const supabase = useMemo(() => createClient(), []);
  const [openTasks, setOpenTasks] = useState<Task[]>([]);
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    const { start, end } = dayRange(todayStr());
    const [open, done] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .is("completed_at", null)
        .order("priority")
        .order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select("*")
        .gte("completed_at", start)
        .lt("completed_at", end)
        .order("completed_at", { ascending: false }),
    ]);
    if (open.data) setOpenTasks(open.data);
    if (done.data) setDoneTasks(done.data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useDataChanged(
    useCallback(
      (table) => {
        if (table === "tasks") void load();
      },
      [load],
    ),
  );

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setTitle("");
    const { data, error } = await supabase
      .from("tasks")
      .insert({ title: t, planned_for: todayStr() })
      .select()
      .single();
    if (error || !data) {
      toast.error("저장에 실패했어요");
      setTitle(t);
      return;
    }
    setOpenTasks((prev) => [data, ...prev]);
  }

  async function toggleTask(task: Task, done: boolean) {
    const completed_at = done ? new Date().toISOString() : null;
    if (done) {
      setOpenTasks((prev) => prev.filter((t) => t.id !== task.id));
      setDoneTasks((prev) => [{ ...task, completed_at }, ...prev]);
    } else {
      setDoneTasks((prev) => prev.filter((t) => t.id !== task.id));
      setOpenTasks((prev) => [{ ...task, completed_at }, ...prev]);
    }
    const { error } = await supabase
      .from("tasks")
      .update({ completed_at })
      .eq("id", task.id);
    if (error) {
      toast.error("변경에 실패했어요");
      void load();
    }
  }

  function selectTask(task: Task) {
    setSelected(task);
    setEditOpen(true);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">오늘</h1>
          <p className="text-sm text-muted-foreground">{formatDateHeader()}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="로그아웃">
          <LogOut className="size-4" />
        </Button>
      </header>

      <form onSubmit={addTask} className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="오늘 할 일 추가..."
        />
        <Button type="submit" size="icon" aria-label="추가">
          <Plus className="size-4" />
        </Button>
      </form>

      {loading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : (
        <div className="space-y-6">
          <ul className="space-y-1">
            {openTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onSelect={selectTask}
              />
            ))}
            {openTasks.length === 0 && (
              <p className="px-2 text-sm text-muted-foreground">
                할 일이 없어요. 하나 추가해볼까요?
              </p>
            )}
          </ul>

          {doneTasks.length > 0 && (
            <div>
              <h2 className="mb-1 px-2 text-xs font-medium text-muted-foreground">
                오늘 완료 {doneTasks.length}
              </h2>
              <ul className="space-y-1">
                {doneTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onSelect={selectTask}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <TaskEditSheet task={selected} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
