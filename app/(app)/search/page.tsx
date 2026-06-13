"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { sanitizeSearch } from "@/lib/search";
import { dday } from "@/lib/dates";
import { TaskItem } from "@/components/task-item";
import { TaskEditSheet } from "@/components/task-edit-sheet";
import { SessionCard } from "@/components/sessions/session-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Target } from "lucide-react";
import { toast } from "sonner";

type Task = Tables<"tasks">;
type Goal = Tables<"goals">;
type AiSession = Tables<"ai_sessions">;

export default function SearchPage() {
  const supabase = useMemo(() => createClient(), []);
  const [q, setQ] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const run = useCallback(
    async (raw: string) => {
      const term = sanitizeSearch(raw);
      if (term.length < 1) {
        setTasks([]);
        setGoals([]);
        setSessions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const [taskRes, goalRes, sessionRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .or(`title.ilike.*${term}*,notes.ilike.*${term}*`)
          .order("completed_at", { ascending: true, nullsFirst: true })
          .limit(20),
        supabase
          .from("goals")
          .select("*")
          .or(`title.ilike.*${term}*,description.ilike.*${term}*`)
          .limit(10),
        supabase
          .from("ai_sessions")
          .select("*")
          .or(`intent.ilike.*${term}*,outcome.ilike.*${term}*,tool.ilike.*${term}*`)
          .order("started_at", { ascending: false })
          .limit(10),
      ]);
      if (taskRes.data) setTasks(taskRes.data);
      if (goalRes.data) setGoals(goalRes.data);
      if (sessionRes.data) setSessions(sessionRes.data);
      setLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    const timer = setTimeout(() => void run(q), q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [q, run]);

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
    setTasks((prev) =>
      prev.map((x) => (x.id === task.id ? { ...x, completed_at } : x)),
    );
  }

  const hasQuery = sanitizeSearch(q).length >= 1;
  const empty =
    hasQuery &&
    !loading &&
    tasks.length === 0 &&
    goals.length === 0 &&
    sessions.length === 0;

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild aria-label="뒤로">
          <Link href="/today">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="할 일·목표·세션 검색..."
        />
      </header>

      {!hasQuery ? (
        <p className="px-2 text-sm text-muted-foreground">
          할 일, 목표, AI 세션을 한 번에 찾아요.
        </p>
      ) : empty ? (
        <p className="px-2 text-sm text-muted-foreground">검색 결과가 없어요.</p>
      ) : (
        <div className="space-y-6">
          {tasks.length > 0 && (
            <section>
              <h2 className="mb-1 px-2 text-xs font-medium text-muted-foreground">
                할 일 {tasks.length}
              </h2>
              <ul className="space-y-1">
                {tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onSelect={(t) => {
                      setSelected(t);
                      setEditOpen(true);
                    }}
                  />
                ))}
              </ul>
            </section>
          )}

          {goals.length > 0 && (
            <section>
              <h2 className="mb-1 px-2 text-xs font-medium text-muted-foreground">
                목표 {goals.length}
              </h2>
              <ul className="space-y-1">
                {goals.map((goal) => (
                  <li key={goal.id}>
                    <Link
                      href={`/goals/${goal.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-accent/50"
                    >
                      <Target className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {goal.title}
                      </span>
                      {goal.target_date && (
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                          {dday(goal.target_date)}
                        </Badge>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {sessions.length > 0 && (
            <section className="space-y-2">
              <h2 className="px-2 text-xs font-medium text-muted-foreground">
                AI 세션 {sessions.length}
              </h2>
              {sessions.map((s) => (
                <SessionCard key={s.id} session={s} />
              ))}
            </section>
          )}
        </div>
      )}

      <TaskEditSheet task={selected} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
