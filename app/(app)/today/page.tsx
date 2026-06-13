"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import {
  consecutiveStreak,
  dateAfterDays,
  dayRange,
  formatDateHeader,
  todayStr,
  tomorrowStr,
} from "@/lib/dates";
import { emitDataChanged, useDataChanged } from "@/lib/events";
import { TaskItem } from "@/components/task-item";
import { TaskEditSheet } from "@/components/task-edit-sheet";
import { PlanCard, FocusBanner } from "@/components/today/plan-card";
import { ReviewCard, DoneFooter } from "@/components/today/review-card";
import { MorningPlanSheet } from "@/components/today/morning-plan-sheet";
import { EveningReviewSheet } from "@/components/today/evening-review-sheet";
import { OpenSessionBanner } from "@/components/today/open-session-banner";
import { CloseSessionSheet } from "@/components/sessions/close-session-sheet";
import {
  DeadlineStrip,
  type DeadlineItem,
} from "@/components/today/deadline-strip";
import { ListSkeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/load-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { LogOut, Plus, Search } from "lucide-react";
import { toast } from "sonner";

type Task = Tables<"tasks">;
type DailyLog = Tables<"daily_logs">;
type AiSession = Tables<"ai_sessions">;

export default function TodayPage() {
  const supabase = useMemo(() => createClient(), []);
  const [log, setLog] = useState<DailyLog | null>(null);
  const [openTasks, setOpenTasks] = useState<Task[]>([]);
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [openSessions, setOpenSessions] = useState<AiSession[]>([]);
  const [aiTodayCount, setAiTodayCount] = useState(0);
  const [closingSession, setClosingSession] = useState<AiSession | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [streak, setStreak] = useState(0);

  const load = useCallback(async () => {
    const t = todayStr();
    const { start, end } = dayRange(t);
    const horizon = dateAfterDays(14);
    const [logRes, open, done, sessions, aiCount, dueTasks, dueMs, reviewed] =
      await Promise.all([
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
        supabase
          .from("ai_sessions")
          .select("*")
          .is("ended_at", null)
          .order("started_at"),
        supabase
          .from("ai_sessions")
          .select("id", { count: "exact", head: true })
          .gte("started_at", start)
          .lt("started_at", end),
        supabase
          .from("tasks")
          .select("id, title, due_date")
          .is("completed_at", null)
          .gt("due_date", t)
          .lte("due_date", horizon)
          .order("due_date")
          .limit(3),
        supabase
          .from("milestones")
          .select("id, title, due_date, goals(title)")
          .is("completed_at", null)
          .gte("due_date", t)
          .lte("due_date", horizon)
          .order("due_date")
          .limit(3),
        supabase
          .from("daily_logs")
          .select("log_date")
          .not("reviewed_at", "is", null)
          .order("log_date", { ascending: false })
          .limit(400),
      ]);
    setError(!!(logRes.error || open.error));
    setLog(logRes.data ?? null);
    if (open.data) setOpenTasks(open.data);
    if (done.data) setDoneTasks(done.data);
    if (sessions.data) setOpenSessions(sessions.data);
    setAiTodayCount(aiCount.count ?? 0);
    setStreak(consecutiveStreak((reviewed.data ?? []).map((r) => r.log_date)));
    const items: DeadlineItem[] = [
      ...(dueTasks.data ?? []).map((x) => ({
        id: x.id,
        kind: "task" as const,
        title: x.title,
        date: x.due_date!,
      })),
      ...(dueMs.data ?? []).map((m) => ({
        id: m.id,
        kind: "milestone" as const,
        title: m.title,
        date: m.due_date!,
        context: (m.goals as { title: string } | null)?.title ?? null,
      })),
    ]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);
    setDeadlines(items);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  // 모든 테이블 변경이 Today 화면 어딘가에 반영된다
  useDataChanged(useCallback(() => void load(), [load]));

  // 항상 켜둔 PWA가 자정을 넘기거나 몇 시간 뒤 다시 열렸을 때 stale 방지:
  // 포커스/가시성 복귀 때마다 todayStr()을 다시 계산하며 새로 불러온다.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void load();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [load]);

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
      // "오늘" 구역 기준으로만 완료를 판단 (지연 구역은 제외)
      const ts = todayStr();
      const inToday = (x: Task) =>
        !(x.due_date && x.due_date < ts && x.planned_for !== ts);
      const wasToday = inToday(task);
      const remainingToday = openTasks.filter(
        (x) => x.id !== task.id && inToday(x),
      );
      setOpenTasks((prev) => prev.filter((x) => x.id !== task.id));
      setDoneTasks((prev) => [{ ...task, completed_at }, ...prev]);
      // 오늘 할 일을 마지막 하나까지 다 끝낸 순간 — 조용히 한 번 인정해준다
      if (wasToday && remainingToday.length === 0) {
        toast.success("오늘 할 일을 다 끝냈어요 🎉");
      }
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

  // 마감이 없거나 미래인 작업에만 노출 — 마감이 오늘이거나 지난 작업은
  // planned_for만 바꿔도 due_date.lte.today에 다시 걸려 사라지지 않기 때문.
  async function rescheduleToTomorrow(task: Task) {
    setOpenTasks((prev) => prev.filter((x) => x.id !== task.id));
    const { error } = await supabase
      .from("tasks")
      .update({ planned_for: tomorrowStr() })
      .eq("id", task.id);
    if (error) {
      toast.error("변경에 실패했어요");
      void load();
      return;
    }
    toast("내일로 옮겼어요");
    emitDataChanged("tasks");
  }

  function selectTask(task: Task) {
    setSelected(task);
    setEditOpen(true);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const t = todayStr();
  const planned = !!log?.planned_at;
  const reviewed = !!log?.reviewed_at;
  const evening = new Date().getHours() >= 18;
  // 지연: 마감이 지났고 오늘 하기로 고른 것도 아닌 항목 — 별도 구역으로 분리
  const overdueTasks = openTasks.filter(
    (x) => x.due_date && x.due_date < t && x.planned_for !== t,
  );
  const todayTasks = openTasks.filter(
    (x) => !(x.due_date && x.due_date < t && x.planned_for !== t),
  );
  // 회고의 "못 끝낸 계획"은 오늘 하기로 고른(planned_for=today) 미완료 작업.
  // 해제 시 planned_for=null로 실제 빠지므로 동작이 일관된다.
  const leftoverTasks = openTasks.filter((x) => x.planned_for === t);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">오늘</h1>
          <p
            className="flex items-center gap-2 text-sm text-muted-foreground"
            suppressHydrationWarning
          >
            {formatDateHeader()}
            {streak >= 2 && (
              <span className="font-medium text-foreground">
                🔥 {streak}일 연속
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" asChild aria-label="검색">
            <Link href="/search">
              <Search className="size-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="로그아웃">
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : error && openTasks.length === 0 && doneTasks.length === 0 && !log ? (
        // 첫 로드 실패만 전체 에러로 — 백그라운드 리페치 실패는 기존 데이터 유지
        <LoadError onRetry={load} />
      ) : (
        <>
          {!planned && <PlanCard onClick={() => setPlanOpen(true)} />}
          {planned && (
            <FocusBanner focus={log!.focus} onEdit={() => setPlanOpen(true)} />
          )}

          <OpenSessionBanner
            sessions={openSessions}
            onClose={(session) => {
              setClosingSession(session);
              setCloseOpen(true);
            }}
          />

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

          {overdueTasks.length > 0 && (
            <div>
              <h2 className="mb-1 px-2 text-xs font-medium text-destructive">
                지연 {overdueTasks.length}
              </h2>
              <ul className="space-y-1">
                {overdueTasks.map((task) => (
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

          <ul className="space-y-1">
            {todayTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onSelect={selectTask}
                onReschedule={
                  !task.due_date || task.due_date > t
                    ? rescheduleToTomorrow
                    : undefined
                }
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

          <DeadlineStrip items={deadlines} />

          {!reviewed && (planned || doneTasks.length > 0 || evening) && (
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
        logDate={t}
        doneTasks={doneTasks}
        leftoverTasks={leftoverTasks}
        aiSessionCount={aiTodayCount}
        onSaved={load}
      />
      <CloseSessionSheet
        session={closingSession}
        open={closeOpen}
        onOpenChange={setCloseOpen}
      />
    </div>
  );
}
