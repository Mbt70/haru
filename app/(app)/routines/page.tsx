"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { freqSummary } from "@/lib/routines";
import { useDataChanged } from "@/lib/events";
import { RoutineFormSheet } from "@/components/routines/routine-form-sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/load-error";
import { ChevronLeft, Plus, Repeat } from "lucide-react";

type Routine = Tables<"routines">;

export default function RoutinesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("routines")
      .select("*")
      .order("active", { ascending: false })
      .order("created_at", { ascending: false });
    setError(!!error);
    if (data) setRoutines(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useDataChanged(
    useCallback(
      (table) => {
        if (table === "routines") void load();
      },
      [load],
    ),
  );

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(r: Routine) {
    setEditing(r);
    setFormOpen(true);
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild aria-label="뒤로">
          <Link href="/today">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">루틴</h1>
          <p className="text-sm text-muted-foreground">
            매일·매주 반복할 일을 자동으로 만들어요
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="size-4" />
          루틴
        </Button>
      </header>

      {loading ? (
        <ListSkeleton rows={3} />
      ) : error && routines.length === 0 ? (
        <LoadError onRetry={load} />
      ) : routines.length === 0 ? (
        <p className="px-2 text-sm text-muted-foreground">
          아직 루틴이 없어요. 매일 회고, 매주 운동처럼 반복할 일을 등록해보세요.
        </p>
      ) : (
        <div className="space-y-2">
          {routines.map((r) => (
            <Card
              key={r.id}
              className={
                r.active ? "cursor-pointer" : "cursor-pointer opacity-60"
              }
              onClick={() => openEdit(r)}
            >
              <CardContent className="flex items-center gap-3 py-3">
                <Repeat className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {freqSummary(r.freq, r.weekdays)}
                  </p>
                </div>
                {!r.active && (
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                    꺼짐
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RoutineFormSheet
        routine={editing}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  );
}
