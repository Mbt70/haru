"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { emitDataChanged } from "@/lib/events";
import { formatShortDate, todayStr, tomorrowStr } from "@/lib/dates";
import { sanitizeSearch } from "@/lib/search";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Chip } from "@/components/chip";
import { toast } from "sonner";

export type QuickAddTab = "task" | "session";

const PRIORITIES = [
  { value: 1, label: "높음" },
  { value: 2, label: "보통" },
  { value: 3, label: "낮음" },
] as const;

// 시트가 닫히면 폼이 언마운트되므로 열릴 때마다 자연스럽게 빈 상태에서 시작
function AddTaskForm({ onClose }: { onClose: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [text, setText] = useState("");
  const [when, setWhen] = useState<"" | "today" | "tomorrow">("");
  const [showDue, setShowDue] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState(2);
  const [saving, setSaving] = useState(false);

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    // 줄바꿈으로 여러 개 한 번에
    const titles = text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (titles.length === 0) return;
    setSaving(true);
    const planned_for =
      when === "today" ? todayStr() : when === "tomorrow" ? tomorrowStr() : null;
    const rows = titles.map((t) => ({
      title: t,
      planned_for,
      due_date: dueDate || null,
      priority,
    }));
    const { error } = await supabase.from("tasks").insert(rows);
    setSaving(false);
    if (error) {
      toast.error("저장에 실패했어요");
      return;
    }
    toast.success(titles.length > 1 ? `${titles.length}개 추가했어요` : "추가했어요");
    emitDataChanged("tasks");
    onClose();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void save();
        }}
        rows={2}
        placeholder="무엇을 해야 하나요? (여러 개는 한 줄에 하나씩)"
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
      <Button type="submit" className="w-full" disabled={saving || !text.trim()}>
        추가
      </Button>
    </form>
  );
}

const TOOLS = ["Claude Code", "ChatGPT", "Gemini", "기타"] as const;

type AiSession = Tables<"ai_sessions">;

// 의도 게이트 — "왜 쓰는지"를 적는 행위 자체가 무의식적 사용을 막는 개입
function StartSessionForm({ onClose }: { onClose: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [tool, setTool] = useState<string>("Claude Code");
  const [intent, setIntent] = useState("");
  const [showExpected, setShowExpected] = useState(false);
  const [expected, setExpected] = useState("");
  const [goalId, setGoalId] = useState("none");
  const [goals, setGoals] = useState<{ id: string; title: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const [pastMatches, setPastMatches] = useState<AiSession[]>([]);

  // 열려 있는 세션 수 + 연결 가능한 활성 목표
  useEffect(() => {
    (async () => {
      const [openRes, goalsRes] = await Promise.all([
        supabase
          .from("ai_sessions")
          .select("id", { count: "exact", head: true })
          .is("ended_at", null),
        supabase
          .from("goals")
          .select("id, title")
          .eq("status", "active")
          .order("created_at", { ascending: false }),
      ]);
      setOpenCount(openRes.count ?? 0);
      if (goalsRes.data) setGoals(goalsRes.data);
    })();
  }, [supabase]);

  // 비슷한 의도로 이미 끝낸 세션이 있으면 재사용하라고 귀띔 (300ms 디바운스)
  useEffect(() => {
    const term = sanitizeSearch(intent);
    if (term.length < 2) {
      setPastMatches([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("ai_sessions")
        .select("*")
        .not("ended_at", "is", null)
        .or(`intent.ilike.*${term}*,outcome.ilike.*${term}*`)
        .order("started_at", { ascending: false })
        .limit(2);
      setPastMatches(data ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [intent, supabase]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const i = intent.trim();
    if (!i) return;
    setSaving(true);
    const { error } = await supabase.from("ai_sessions").insert({
      tool,
      intent: i,
      expected_outcome: expected.trim() || null,
      goal_id: goalId === "none" ? null : goalId,
    });
    setSaving(false);
    if (error) {
      toast.error("저장에 실패했어요");
      return;
    }
    toast.success("세션 시작 — 끝나면 꼭 마무리해요");
    emitDataChanged("ai_sessions");
    onClose();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {openCount > 0 && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
          진행 중인 세션이 {openCount}개 있어요. 먼저 끝내는 게 어때요?
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {TOOLS.map((t) => (
          <Chip key={t} selected={tool === t} onClick={() => setTool(t)}>
            {t}
          </Chip>
        ))}
      </div>
      <Input
        autoFocus
        value={intent}
        onChange={(e) => setIntent(e.target.value)}
        placeholder="왜 쓰려고 하나요? (필수)"
      />
      {pastMatches.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-dashed px-3 py-2">
          <p className="text-[11px] font-medium text-muted-foreground">
            전에 비슷한 걸 한 적이 있어요
          </p>
          {pastMatches.map((m) => (
            <div key={m.id} className="text-xs">
              <span className="text-foreground">{m.intent}</span>
              {m.outcome && (
                <span className="text-muted-foreground"> — {m.outcome}</span>
              )}
              <span className="ml-1 text-muted-foreground">
                ({formatShortDate(m.started_at.slice(0, 10))})
              </span>
            </div>
          ))}
        </div>
      )}
      {goals.length > 0 && (
        <Select value={goalId} onValueChange={setGoalId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="목표에 연결 (선택)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">목표에 연결 안 함</SelectItem>
            {goals.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {showExpected ? (
        <Textarea
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          rows={2}
          placeholder="어떤 결과가 나오면 성공인가요?"
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowExpected(true)}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          + 기대 결과 추가
        </button>
      )}
      <Button type="submit" className="w-full" disabled={saving || !intent.trim()}>
        세션 시작
      </Button>
    </form>
  );
}

export function QuickAddSheet({
  open,
  onOpenChange,
  defaultTab = "task",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: QuickAddTab;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1rem)]"
      >
        <SheetHeader>
          <SheetTitle>퀵 추가</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <Tabs defaultValue={defaultTab}>
            <TabsList className="mb-3 grid w-full grid-cols-2">
              <TabsTrigger value="task">할 일</TabsTrigger>
              <TabsTrigger value="session">AI 세션</TabsTrigger>
            </TabsList>
            <TabsContent value="task">
              <AddTaskForm onClose={() => onOpenChange(false)} />
            </TabsContent>
            <TabsContent value="session">
              <StartSessionForm onClose={() => onOpenChange(false)} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
