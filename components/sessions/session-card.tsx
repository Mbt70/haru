"use client";

import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { emitDataChanged } from "@/lib/events";
import { formatElapsed, formatTime } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type AiSession = Tables<"ai_sessions">;

const RESULT_LABELS: Record<string, string> = {
  achieved: "달성",
  partial: "부분 달성",
  abandoned: "중단",
};

export function SessionCard({
  session,
  onCloseRequest,
}: {
  session: AiSession;
  onCloseRequest?: (session: AiSession) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const isOpen = session.ended_at === null;
  const elapsed = isOpen ? formatElapsed(session.started_at) : null;

  async function abandon() {
    const { error } = await supabase
      .from("ai_sessions")
      .update({ ended_at: new Date().toISOString(), result: "abandoned" })
      .eq("id", session.id);
    if (error) {
      toast.error("변경에 실패했어요");
      return;
    }
    emitDataChanged("ai_sessions");
  }

  return (
    <Card className={isOpen ? "border-primary/40" : undefined}>
      <CardContent className="space-y-1.5 py-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            {session.tool}
          </Badge>
          {isOpen ? (
            <Badge className="px-1.5 py-0 text-[10px]">진행 중</Badge>
          ) : (
            session.result && (
              <Badge
                variant={session.result === "abandoned" ? "destructive" : "outline"}
                className="px-1.5 py-0 text-[10px]"
              >
                {RESULT_LABELS[session.result] ?? session.result}
              </Badge>
            )
          )}
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {isOpen && elapsed ? (
              <span className={elapsed.stale ? "text-destructive" : undefined}>
                {elapsed.text}
              </span>
            ) : (
              <>
                {formatTime(session.started_at)}
                {session.ended_at && `–${formatTime(session.ended_at)}`}
              </>
            )}
          </span>
        </div>
        <p className="text-sm font-medium">{session.intent}</p>
        {isOpen && session.expected_outcome && (
          <p className="text-xs text-muted-foreground">
            기대: {session.expected_outcome}
          </p>
        )}
        {session.outcome && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {session.outcome}
          </p>
        )}
        {isOpen && onCloseRequest && (
          <div className="flex gap-2 pt-0.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCloseRequest(session)}
            >
              마무리
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={abandon}
            >
              중단
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
