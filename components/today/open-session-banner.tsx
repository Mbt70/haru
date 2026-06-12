"use client";

import type { Tables } from "@/lib/database.types";
import { formatTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

type AiSession = Tables<"ai_sessions">;

export function OpenSessionBanner({
  sessions,
  onClose,
}: {
  sessions: AiSession[];
  onClose: (session: AiSession) => void;
}) {
  if (sessions.length === 0) return null;
  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3"
        >
          <Sparkles className="size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {session.tool} 세션 진행 중
              <span className="ml-1.5 font-normal text-muted-foreground">
                {formatTime(session.started_at)} 시작
              </span>
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {session.intent}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => onClose(session)}
          >
            마무리
          </Button>
        </div>
      ))}
    </div>
  );
}
