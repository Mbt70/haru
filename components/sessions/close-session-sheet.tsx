"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { emitDataChanged } from "@/lib/events";
import { formatTime } from "@/lib/dates";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Chip } from "@/components/chip";
import { toast } from "sonner";

type AiSession = Tables<"ai_sessions">;

const RESULTS = [
  { value: "achieved", label: "달성" },
  { value: "partial", label: "부분 달성" },
  { value: "abandoned", label: "중단" },
] as const;

function CloseForm({
  session,
  onDone,
}: {
  session: AiSession;
  onDone: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [result, setResult] = useState<string>("achieved");
  const [outcome, setOutcome] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("ai_sessions")
      .update({
        ended_at: new Date().toISOString(),
        result,
        outcome: outcome.trim() || null,
        // 달성이 아니면 "다음 단계"를 남겨 나중에 이어갈 수 있게
        next_step: result === "achieved" ? null : nextStep.trim() || null,
      })
      .eq("id", session.id);
    setSaving(false);
    if (error) {
      toast.error("저장에 실패했어요");
      return;
    }
    toast.success("세션을 마무리했어요");
    emitDataChanged("ai_sessions");
    onDone();
  }

  return (
    <div className="space-y-4 px-4">
      <div className="rounded-lg bg-muted px-3 py-2 text-sm">
        <span className="font-medium">{session.tool}</span>
        <span className="text-muted-foreground">
          {" "}
          · {formatTime(session.started_at)} 시작
        </span>
        <p className="mt-1 text-muted-foreground">{session.intent}</p>
        {session.expected_outcome && (
          <p className="mt-1 text-xs text-muted-foreground">
            기대했던 것: {session.expected_outcome}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label>결과</Label>
        <div className="flex gap-2">
          {RESULTS.map((r) => (
            <Chip
              key={r.value}
              selected={result === r.value}
              onClick={() => setResult(r.value)}
            >
              {r.label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="outcome">얻은 것 (나중에 검색됩니다)</Label>
        <Textarea
          id="outcome"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          rows={3}
          placeholder="핵심 결과·결론을 한두 줄로. 같은 질문을 또 하지 않게."
        />
      </div>
      {result !== "achieved" && (
        <div className="space-y-2">
          <Label htmlFor="next-step">다음에 이어서 할 것</Label>
          <Textarea
            id="next-step"
            value={nextStep}
            onChange={(e) => setNextStep(e.target.value)}
            rows={2}
            placeholder="어디서 멈췄고 다음에 뭘 하면 되는지. 나중에 원탭으로 이어가요."
          />
        </div>
      )}
      <Button className="w-full" onClick={save} disabled={saving}>
        세션 마무리
      </Button>
    </div>
  );
}

export function CloseSessionSheet({
  session,
  open,
  onOpenChange,
  onClosed,
}: {
  session: AiSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed?: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1rem)]"
      >
        <SheetHeader>
          <SheetTitle>세션 마무리</SheetTitle>
          <SheetDescription>
            기록해두면 다음에 같은 걸 다시 묻지 않게 돼요
          </SheetDescription>
        </SheetHeader>
        {open && session && (
          <CloseForm
            key={session.id}
            session={session}
            onDone={() => {
              onOpenChange(false);
              onClosed?.();
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
