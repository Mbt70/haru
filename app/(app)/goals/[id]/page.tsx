"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { dday, formatRelativeDay, todayStr } from "@/lib/dates";
import { useDataChanged } from "@/lib/events";
import { MilestoneList } from "@/components/goals/milestone-list";
import { GoalFormSheet } from "@/components/goals/goal-form-sheet";
import { TaskItem } from "@/components/task-item";
import { TaskEditSheet } from "@/components/task-edit-sheet";
import { SessionCard } from "@/components/sessions/session-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

type Goal = Tables<"goals">;
type Milestone = Tables<"milestones">;
type Task = Tables<"tasks">;
type AiSession = Tables<"ai_sessions">;

export default function GoalDetailPage() {
  const params = useParams<{ id: string }>();
  const goalId = params.id;
  const supabase = useMemo(() => createClient(), []);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskEditOpen, setTaskEditOpen] = useState(false);

  const load = useCallback(async () => {
    const [goalRes, msRes, taskRes, sessionRes] = await Promise.all([
      supabase.from("goals").select("*").eq("id", goalId).maybeSingle(),
      supabase
        .from("milestones")
        .select("*")
        .eq("goal_id", goalId)
        .order("sort_order")
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("tasks")
        .select("*")
        .eq("goal_id", goalId)
        .order("completed_at", { ascending: true, nullsFirst: true })
        .order("priority")
        .order("created_at", { ascending: false }),
      supabase
        .from("ai_sessions")
        .select("*")
        .eq("goal_id", goalId)
        .order("started_at", { ascending: false })
        .limit(20),
    ]);
    setGoal(goalRes.data ?? null);
    if (msRes.data) setMilestones(msRes.data);
    if (taskRes.data) setTasks(taskRes.data);
    if (sessionRes.data) setSessions(sessionRes.data);
    setLoading(false);
  }, [supabase, goalId]);

  useEffect(() => {
    void load();
  }, [load]);

  useDataChanged(
    useCallback(
      (table) => {
        if (
          table === "goals" ||
          table === "milestones" ||
          table === "tasks" ||
          table === "ai_sessions"
        )
          void load();
      },
      [load],
    ),
  );

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const t = newTask.trim();
    if (!t) return;
    setNewTask("");
    const { error } = await supabase
      .from("tasks")
      .insert({ title: t, goal_id: goalId });
    if (error) {
      toast.error("저장에 실패했어요");
      setNewTask(t);
      return;
    }
    void load();
  }

  async function toggleTask(task: Task, done: boolean) {
    const completed_at = done ? new Date().toISOString() : null;
    const { error } = await supabase
      .from("tasks")
      .update({ completed_at })
      .eq("id", task.id);
    if (error) {
      toast.error("변경에 실패했어요");
      return;
    }
    void load();
  }

  const total = milestones.length;
  const done = milestones.filter((m) => m.completed_at !== null).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const openTasks = tasks.filter((t) => t.completed_at === null);
  const doneTasks = tasks.filter((t) => t.completed_at !== null);

  // 마지막 작업: 완료한 할 일 / AI 세션 중 가장 최근 활동
  const activityDates = [
    ...tasks.filter((t) => t.completed_at).map((t) => t.completed_at!),
    ...sessions.map((s) => s.started_at),
  ];
  const lastTouched =
    activityDates.length > 0
      ? activityDates.reduce((a, b) => (a > b ? a : b))
      : null;

  if (!loading && !goal) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">목표를 찾을 수 없어요.</p>
        <Button variant="outline" asChild>
          <Link href="/goals">목표 목록으로</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" asChild aria-label="뒤로">
          <Link href="/goals">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        {goal && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditOpen(true)}
            aria-label="목표 편집"
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </div>

      {loading || !goal ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : (
        <>
          <header className="space-y-2">
            <div className="flex items-center gap-2">
              {goal.category && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  {goal.category}
                </Badge>
              )}
              {goal.target_date && (
                <Badge
                  variant={
                    goal.target_date < todayStr() && goal.status === "active"
                      ? "destructive"
                      : "outline"
                  }
                  className="px-1.5 py-0 text-[10px]"
                >
                  {dday(goal.target_date)}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{goal.title}</h1>
            {goal.description && (
              <p className="text-sm text-muted-foreground">{goal.description}</p>
            )}
            <div className="flex items-center gap-3 pt-1">
              <Progress value={pct} className="h-1.5 flex-1" />
              <span className="shrink-0 text-xs text-muted-foreground">
                {done}/{total}
              </span>
            </div>
            {lastTouched && (
              <p className="text-xs text-muted-foreground">
                마지막 작업: {formatRelativeDay(lastTouched)}
              </p>
            )}
          </header>

          <section className="space-y-2">
            <h2 className="text-sm font-medium">마일스톤</h2>
            <MilestoneList
              goalId={goal.id}
              milestones={milestones}
              onChanged={load}
            />
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium">연결된 할 일</h2>
            <form onSubmit={addTask} className="flex gap-2">
              <Input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="이 목표의 할 일 추가..."
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
                  onSelect={(t) => {
                    setSelectedTask(t);
                    setTaskEditOpen(true);
                  }}
                />
              ))}
              {doneTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onSelect={(t) => {
                    setSelectedTask(t);
                    setTaskEditOpen(true);
                  }}
                />
              ))}
            </ul>
          </section>

          {sessions.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium">AI 세션</h2>
              <div className="space-y-2">
                {sessions.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <GoalFormSheet goal={goal} open={editOpen} onOpenChange={setEditOpen} />
      <TaskEditSheet
        task={selectedTask}
        open={taskEditOpen}
        onOpenChange={setTaskEditOpen}
      />
    </div>
  );
}
