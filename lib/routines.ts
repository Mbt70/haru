import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { emitDataChanged } from "@/lib/events";
import { todayStr } from "@/lib/dates";

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** "매일" / "매주 월,수,금" */
export function freqSummary(freq: string, weekdays: number[] | null): string {
  if (freq === "daily") return "매일";
  const days = (weekdays ?? [])
    .slice()
    .sort((a, b) => a - b)
    .map((d) => WEEKDAYS_KO[d]);
  return days.length ? `매주 ${days.join(",")}` : "매주";
}

/**
 * 활성 루틴 중 오늘에 해당하고 아직 생성 안 된 것의 할 일 인스턴스를 만든다.
 * last_generated 가드 + tasks(routine_id, planned_for) 유니크로 멱등 보장.
 * 새로 만든 게 있으면 true.
 */
export async function generateDueRoutines(
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  const today = todayStr();
  const weekday = new Date().getDay(); // 0=일 (KST 로컬)
  const { data: routines } = await supabase
    .from("routines")
    .select("*")
    .eq("active", true);
  if (!routines || routines.length === 0) return false;

  let generated = false;
  for (const r of routines) {
    if (r.last_generated === today) continue;
    const matches =
      r.freq === "daily" ||
      (r.freq === "weekly" && (r.weekdays ?? []).includes(weekday));
    if (!matches) continue;
    const { error } = await supabase.from("tasks").insert({
      title: r.title,
      notes: r.notes,
      priority: r.priority,
      goal_id: r.goal_id,
      planned_for: today,
      routine_id: r.id,
    });
    // 유니크 위반(이미 다른 기기에서 생성)은 무시
    if (!error) generated = true;
    await supabase
      .from("routines")
      .update({ last_generated: today })
      .eq("id", r.id);
  }
  // 새로 만든 게 있으면 열려 있는 다른 페이지도 갱신. generated는 같은 날
  // 두 번째 호출부터 false이므로 reload→generate 루프가 생기지 않는다.
  if (generated) emitDataChanged("tasks");
  return generated;
}
