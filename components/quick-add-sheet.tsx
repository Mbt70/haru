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
    <form onSubmit={save} className="space-y-4">
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

const TOOLS = ["Claude Code", "ChatGPT", "Gemini", "기타"] as const;

// 의도 게이트 — "왜 쓰는지"를 적는 행위 자체가 무의식적 사용을 막는 개입
function StartSessionForm({ onClose }: { onClose: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [tool, setTool] = useState<string>("Claude Code");
  const [intent, setIntent] = useState("");
  const [showExpected, setShowExpected] = useState(false);
  const [expected, setExpected] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const i = intent.trim();
    if (!i) return;
    setSaving(true);
    const { error } = await supabase.from("ai_sessions").insert({
      tool,
      intent: i,
      expected_outcome: expected.trim() || null,
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
