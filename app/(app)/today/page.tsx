"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { dayRange, formatDateHeader, todayStr } from "@/lib/dates";
import { useDataChanged } from "@/lib/events";
import { TaskItem } from "@/components/task-item";
import { TaskEditSheet } from "@/components/task-edit-sheet";
import { PlanCard, FocusBanner } from "@/components/today/plan-card";
import { ReviewCard, DoneFooter } from "@/components/today/review-card";
import { MorningPlanSheet } from "@/components/today/morning-plan-sheet";
import { EveningReviewSheet } from "@/components/today/evening-review-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Plus } from "lucide-react";
import { toast } from "sonner";

type Task = Tables<"tasks">;
type DailyLog = Tables<"daily_logs">;

export default function TodayPage() {
  const supabase = useMemo(() => createClient(), []);
  const [log, setLog] = useState<DailyLog | null>(null);
  const [openTasks, setOpenTasks] = useState<Task[]>([]);
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const load = useCallback(async () => {
    const t = todayStr();
    const { start, end } = dayRange(t);
    const [logRes, open, done] = await Promise.all([
      supabase.from("daily_logs").select("*").eq("log_date", t).maybeSingle(),
      supabase
        .from("tasks")
        .select("*")
        .is("completed_at", null)
        .or(`planned_for.eq.${t},due_date.lte.${t}`)
        .order("priority")
        .order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select("*")
        .gte("completed_at", start)
        .lt("completed_at", end)
        .order("completed_at", { ascending: false }),
    ]);
    setLog(logRes.data ?? null);
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
        if (table === "tasks" || table === "daily_logs") void load();
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

  const planned = !!log?.planned_at;
  const reviewed = !!log?.reviewed_at;
  const evening = new Date().getHours() >= 18;
  const leftoverTasks = openTasks.filter((t) => t.planned_for === todayStr());

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">오늘</h1>
          <p className="text-sm text-muted-foreground" suppressHydrationWarning>
            {formatDateHeader()}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="로그아웃">
          <LogOut className="size-4" />
        </Button>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : (
        <>
          {!planned && <PlanCard onClick={() => setPlanOpen(true)} />}
          {planned && (
            <FocusBanner focus={log!.focus} onEdit={() => setPlanOpen(true)} />
          )}

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
                오늘 할 일이 없어요.
                {!planned && " 계획부터 세워볼까요?"}
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

          {planned && !reviewed && (
            <ReviewCard evening={evening} onClick={() => setReviewOpen(true)} />
          )}
          {reviewed && (
            <DoneFooter
              reflection={log!.reflection}
              onEdit={() => setReviewOpen(true)}
            />
          )}
        </>
      )}

      <TaskEditSheet task={selected} open={editOpen} onOpenChange={setEditOpen} />
      <MorningPlanSheet
        open={planOpen}
        onOpenChange={setPlanOpen}
        log={log}
        onSaved={load}
      />
      <EveningReviewSheet
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        log={log}
        doneTasks={doneTasks}
        leftoverTasks={leftoverTasks}
        onSaved={load}
      />
    </div>
  );
}
