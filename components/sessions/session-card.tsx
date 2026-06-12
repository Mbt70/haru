"use client";

import type { Tables } from "@/lib/database.types";
import { formatTime } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
  const isOpen = session.ended_at === null;
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
            {formatTime(session.started_at)}
            {session.ended_at && `–${formatTime(session.ended_at)}`}
          </span>
        </div>
        <p className="text-sm font-medium">{session.intent}</p>
        {session.outcome && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {session.outcome}
          </p>
        )}
        {isOpen && onCloseRequest && (
          <Button
            size="sm"
            variant="outline"
            className="mt-1"
            onClick={() => onCloseRequest(session)}
          >
            마무리
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
