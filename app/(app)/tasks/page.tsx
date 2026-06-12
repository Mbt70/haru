"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { dday, formatShortDate, todayStr } from "@/lib/dates";
import { useDataChanged } from "@/lib/events";
import { TaskItem } from "@/components/task-item";
import { TaskEditSheet } from "@/components/task-edit-sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, Flag } from "lucide-react";
import { toast } from "sonner";

type Task = Tables<"tasks">;
type MilestoneWithGoal = Tables<"milestones"> & {
  goals: { title: string } | null;
};

type AgendaItem = {
  key: string;
  kind: "task" | "milestone";
  date: string;
  task?: Task;
  milestone?: MilestoneWithGoal;
};

function Section({
  title,
  tasks,
  onToggle,
  onSelect,
}: {
  title: string;
  tasks: Task[];
  onToggle: (task: Task, done: boolean) => void;
  onSelect: (task: Task) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <section>
      <h2 className="mb-1 px-2 text-xs font-medium text-muted-foreground">
        {title} {tasks.length}
      </h2>
      <ul className="space-y-1">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={onToggle}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </section>
  );
}

function TasksContent() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<string>(
    searchParams.get("tab") === "agenda" ? "agenda" : "list",
  );
  const [openTasks, setOpenTasks] = useState<Task[]>([]);
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<MilestoneWithGoal[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    const [open, done, ms] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .is("completed_at", null)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("priority")
        .order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select("*")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(30),
      supabase
        .from("milestones")
        .select("*, goals(title)")
        .is("completed_at", null)
        .not("due_date", "is", null)
        .order("due_date"),
    ]);
    if (open.data) setOpenTasks(open.data);
    if (done.data) setDoneTasks(done.data);
    if (ms.data) setMilestones(ms.data as MilestoneWithGoal[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useDataChanged(
    useCallback(
      (table) => {
        if (table === "tasks" || table === "milestones" || table === "goals")
          void load();
      },
      [load],
    ),
  );

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

  async function toggleMilestone(m: MilestoneWithGoal) {
    const { error } = await supabase
      .from("milestones")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", m.id);
    if (error) {
      toast.error("변경에 실패했어요");
      return;
    }
    void load();
  }

  function selectTask(task: Task) {
    setSelected(task);
    setEditOpen(true);
  }

  const t = todayStr();
  const overdue = openTasks.filter((x) => x.due_date && x.due_date < t);
  const dueToday = openTasks.filter((x) => x.due_date === t);
  const upcoming = openTasks.filter((x) => x.due_date && x.due_date > t);
  const noDate = openTasks.filter((x) => !x.due_date);

  // 통합 일정: 마감 있는 할 일 ∪ 마감 있는 마일스톤
  const agendaItems: AgendaItem[] = [
    ...openTasks
      .filter((x): x is Task & { due_date: string } => x.due_date !== null)
      .map((task) => ({
        key: `task-${task.id}`,
        kind: "task" as const,
        date: task.due_date,
        task,
      })),
    ...milestones
      .filter(
        (m): m is MilestoneWithGoal & { due_date: string } =>
          m.due_date !== null,
      )
      .map((m) => ({
        key: `ms-${m.id}`,
        kind: "milestone" as const,
        date: m.due_date,
        milestone: m,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const agendaGroups = new Map<string, AgendaItem[]>();
  for (const item of agendaItems) {
    const groupKey = item.date < t ? "overdue" : item.date;
    const arr = agendaGroups.get(groupKey) ?? [];
    arr.push(item);
    agendaGroups.set(groupKey, arr);
  }

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">할 일</h1>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">목록</TabsTrigger>
            <TabsTrigger value="agenda">다가오는 일정</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : tab === "list" ? (
        <div className="space-y-6">
          {openTasks.length === 0 && (
            <p className="px-2 text-sm text-muted-foreground">
              할 일이 없어요. 아래 + 버튼으로 추가해보세요.
            </p>
          )}
          <Section title="지연" tasks={overdue} onToggle={toggleTask} onSelect={selectTask} />
          <Section title="오늘 마감" tasks={dueToday} onToggle={toggleTask} onSelect={selectTask} />
          <Section title="예정" tasks={upcoming} onToggle={toggleTask} onSelect={selectTask} />
          <Section title="날짜 없음" tasks={noDate} onToggle={toggleTask} onSelect={selectTask} />

          {doneTasks.length > 0 && (
            <section>
              <Button
                variant="ghost"
                size="sm"
                className="px-2 text-xs text-muted-foreground"
                onClick={() => setShowDone(!showDone)}
              >
                {showDone ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
                완료 {doneTasks.length}
              </Button>
              {showDone && (
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
              )}
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {agendaItems.length === 0 && (
            <p className="px-2 text-sm text-muted-foreground">
              마감이 있는 할 일이나 마일스톤이 아직 없어요.
            </p>
          )}
          {[...agendaGroups.entries()].map(([groupKey, items]) => (
            <section key={groupKey}>
              <h2 className="mb-1 px-2 text-xs font-medium text-muted-foreground">
                {groupKey === "overdue"
                  ? `지연 ${items.length}`
                  : `${formatShortDate(groupKey)} · ${dday(groupKey)}`}
              </h2>
              <ul className="space-y-1">
                {items.map((item) =>
                  item.kind === "task" && item.task ? (
                    <TaskItem
                      key={item.key}
                      task={item.task}
                      onToggle={toggleTask}
                      onSelect={selectTask}
                    />
                  ) : item.milestone ? (
                    <li
                      key={item.key}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5"
                    >
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => toggleMilestone(item.milestone!)}
                        aria-label="마일스톤 완료"
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-center gap-1.5 truncate text-sm">
                          <Flag className="size-3 shrink-0 text-muted-foreground" />
                          {item.milestone.title}
                        </span>
                        {item.milestone.goals && (
                          <span className="text-xs text-muted-foreground">
                            {item.milestone.goals.title}
                          </span>
                        )}
                      </div>
                      {groupKey === "overdue" && (
                        <Badge
                          variant="destructive"
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {dday(item.date)}
                        </Badge>
                      )}
                    </li>
                  ) : null,
                )}
              </ul>
            </section>
          ))}
        </div>
      )}

      <TaskEditSheet task={selected} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TasksContent />
    </Suspense>
  );
}
