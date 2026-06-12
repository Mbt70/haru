"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { formatShortDate } from "@/lib/dates";
import { useDataChanged } from "@/lib/events";
import { SessionCard } from "@/components/sessions/session-card";
import { CloseSessionSheet } from "@/components/sessions/close-session-sheet";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";

type AiSession = Tables<"ai_sessions">;

export default function SessionsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [q, setQ] = useState("");
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState<AiSession | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);

  const load = useCallback(
    async (query: string) => {
      let builder = supabase
        .from("ai_sessions")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(100);
      const cleaned = query.trim().replace(/[,()]/g, " ").trim();
      if (cleaned) {
        // PostgREST or() 구문은 와일드카드로 *를 쓴다
        builder = builder.or(
          `intent.ilike.*${cleaned}*,outcome.ilike.*${cleaned}*,tool.ilike.*${cleaned}*`,
        );
      }
      const { data } = await builder;
      if (data) setSessions(data);
      setLoading(false);
    },
    [supabase],
  );

  // 300ms 디바운스 검색
  useEffect(() => {
    const timer = setTimeout(() => void load(q), q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [q, load]);

  useDataChanged(
    useCallback(
      (table) => {
        if (table === "ai_sessions") void load(q);
      },
      [load, q],
    ),
  );

  function requestClose(session: AiSession) {
    setClosing(session);
    setCloseOpen(true);
  }

  const openSessions = sessions.filter((s) => s.ended_at === null);
  const closedSessions = sessions.filter((s) => s.ended_at !== null);

  const groups = new Map<string, AiSession[]>();
  for (const s of closedSessions) {
    const day = format(parseISO(s.started_at), "yyyy-MM-dd");
    const arr = groups.get(day) ?? [];
    arr.push(s);
    groups.set(day, arr);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">AI 세션</h1>
        <p className="text-sm text-muted-foreground">
          의도를 적고 시작하고, 결과를 남기고 끝내요
        </p>
      </header>

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="의도·결과·툴 검색..."
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : sessions.length === 0 ? (
        <p className="px-2 text-sm text-muted-foreground">
          {q
            ? "검색 결과가 없어요."
            : "아직 기록이 없어요. + 버튼에서 AI 세션을 시작해보세요."}
        </p>
      ) : (
        <div className="space-y-6">
          {openSessions.length > 0 && (
            <section className="space-y-2">
              <h2 className="px-1 text-xs font-medium text-muted-foreground">
                진행 중 {openSessions.length}
              </h2>
              {openSessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onCloseRequest={requestClose}
                />
              ))}
            </section>
          )}
          {[...groups.entries()].map(([day, items]) => (
            <section key={day} className="space-y-2">
              <h2 className="px-1 text-xs font-medium text-muted-foreground">
                {formatShortDate(day)}
              </h2>
              {items.map((s) => (
                <SessionCard key={s.id} session={s} />
              ))}
            </section>
          ))}
        </div>
      )}

      <CloseSessionSheet
        session={closing}
        open={closeOpen}
        onOpenChange={setCloseOpen}
      />
    </div>
  );
}
