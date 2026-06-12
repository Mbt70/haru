"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { todayStr } from "@/lib/dates";
import { useDataChanged } from "@/lib/events";
import { TaskItem } from "@/components/task-item";
import { TaskEditSheet } from "@/components/task-edit-sheet";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type Task = Tables<"tasks">;

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

export default function TasksPage() {
  const supabase = useMemo(() => createClient(), []);
  const [openTasks, setOpenTasks] = useState<Task[]>([]);
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    const [open, done] = await Promise.all([
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

  function selectTask(task: Task) {
    setSelected(task);
    setEditOpen(true);
  }

  const t = todayStr();
  const overdue = openTasks.filter((x) => x.due_date && x.due_date < t);
  const dueToday = openTasks.filter((x) => x.due_date === t);
  const upcoming = openTasks.filter((x) => x.due_date && x.due_date > t);
  const noDate = openTasks.filter((x) => !x.due_date);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">할 일</h1>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : (
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
      )}

      <TaskEditSheet task={selected} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
