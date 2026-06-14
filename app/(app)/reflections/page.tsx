"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { formatShortDate } from "@/lib/dates";
import { useDataChanged } from "@/lib/events";
import { Card, CardContent } from "@/components/ui/card";
import { ListSkeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/load-error";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

type DailyLog = Tables<"daily_logs">;

export default function ReflectionsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("daily_logs")
      .select("*")
      .not("reflection", "is", null)
      .order("log_date", { ascending: false })
      .limit(120);
    setError(!!error);
    if (data) setLogs(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useDataChanged(
    useCallback(
      (table) => {
        if (table === "daily_logs") void load();
      },
      [load],
    ),
  );

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild aria-label="뒤로">
          <Link href="/today">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">회고 기록</h1>
          <p className="text-sm text-muted-foreground">
            매일의 생각을 모아서 — 내가 어떻게 지나왔는지
          </p>
        </div>
      </header>

      {loading ? (
        <ListSkeleton rows={4} />
      ) : error && logs.length === 0 ? (
        <LoadError onRetry={load} />
      ) : logs.length === 0 ? (
        <p className="px-2 text-sm text-muted-foreground">
          아직 회고가 없어요. 저녁에 하루를 마무리하면 여기 쌓여요.
        </p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="space-y-1.5 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatShortDate(log.log_date)}
                  </span>
                </div>
                {log.focus && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">포커스: </span>
                    {log.focus}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-sm">{log.reflection}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
