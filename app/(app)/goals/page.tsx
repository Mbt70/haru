"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useDataChanged } from "@/lib/events";
import {
  GoalCard,
  type GoalWithMilestones,
} from "@/components/goals/goal-card";
import { GoalFormSheet } from "@/components/goals/goal-form-sheet";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/load-error";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

export default function GoalsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [goals, setGoals] = useState<GoalWithMilestones[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("goals")
      .select("*, milestones(id, completed_at)")
      .order("target_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    setError(!!error);
    if (data) setGoals(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useDataChanged(
    useCallback(
      (table) => {
        if (table === "goals" || table === "milestones") void load();
      },
      [load],
    ),
  );

  const active = goals.filter((g) => g.status === "active");
  const inactive = goals.filter((g) => g.status !== "active");

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">목표</h1>
          <p className="text-sm text-muted-foreground">
            대회, 역량 — 가고 있는 방향
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          목표
        </Button>
      </header>

      {loading ? (
        <ListSkeleton rows={3} />
      ) : error && goals.length === 0 ? (
        <LoadError onRetry={load} />
      ) : (
        <div className="space-y-3">
          {active.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
          {active.length === 0 && (
            <p className="px-2 text-sm text-muted-foreground">
              아직 목표가 없어요. OGC, 한이음 같은 대회부터 등록해볼까요?
            </p>
          )}

          {inactive.length > 0 && (
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="px-2 text-xs text-muted-foreground"
                onClick={() => setShowInactive(!showInactive)}
              >
                {showInactive ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
                완료·보관 {inactive.length}
              </Button>
              {showInactive && (
                <div className="mt-2 space-y-3">
                  {inactive.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <GoalFormSheet goal={null} open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
