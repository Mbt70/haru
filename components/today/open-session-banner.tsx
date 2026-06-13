"use client";

import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { emitDataChanged } from "@/lib/events";
import { formatElapsed, formatTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AiSession = Tables<"ai_sessions">;

export function OpenSessionBanner({
  sessions,
  onClose,
}: {
  sessions: AiSession[];
  onClose: (session: AiSession) => void;
}) {
  const supabase = useMemo(() => createClient(), []);

  async function abandon(session: AiSession) {
    const { error } = await supabase
      .from("ai_sessions")
      .update({
        ended_at: new Date().toISOString(),
        result: "abandoned",
      })
      .eq("id", session.id);
    if (error) {
      toast.error("변경에 실패했어요");
      return;
    }
    emitDataChanged("ai_sessions");
  }

  if (sessions.length === 0) return null;
  return (
    <div className="space-y-2">
      {sessions.map((session) => {
        const elapsed = formatElapsed(session.started_at);
        return (
          <div
            key={session.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3",
              elapsed.stale
                ? "border-destructive/40 bg-destructive/5"
                : "border-primary/40 bg-primary/5",
            )}
          >
            <Sparkles
              className={cn(
                "size-4 shrink-0",
                elapsed.stale ? "text-destructive" : "text-primary",
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {session.tool}
                <span
                  className={cn(
                    "ml-1.5 font-normal",
                    elapsed.stale
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {elapsed.text} · {formatTime(session.started_at)} 시작
                </span>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {session.intent}
                {session.expected_outcome && ` → ${session.expected_outcome}`}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <Button size="sm" variant="outline" onClick={() => onClose(session)}>
                마무리
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={() => abandon(session)}
              >
                중단
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
