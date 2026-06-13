import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import type { Database } from "@/lib/database.types";

export const runtime = "nodejs";

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:noreply@example.com";
  if (!url || !serviceKey || !vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "server not configured" }, { status: 500 });
  }

  const admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  });
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  // 서버는 UTC. KST = UTC+9. shift 후 ISO를 잘라 KST 벽시계/날짜를 얻는다.
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  const hhmm = kst.toISOString().slice(11, 16); // "HH:MM"
  const today = kst.toISOString().slice(0, 10); // "yyyy-MM-dd"

  // 행이 적으므로(1인용) 전체를 받아 JS에서 평가 — .or() 부정 구문 회피
  const { data: prefs } = await admin.from("reminder_prefs").select("*");

  async function send(subs: Sub[], title: string, body: string, url: string) {
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title, body, url, tag: "reminder" }),
          );
        } catch (err: unknown) {
          const code = (err as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410) {
            await admin.from("push_subscriptions").delete().eq("id", s.id);
          }
        }
      }),
    );
  }

  let sentMorning = 0;
  let sentEvening = 0;

  for (const pref of prefs ?? []) {
    const uid = pref.user_id;
    const morningDue =
      pref.morning_time && hhmm >= pref.morning_time && pref.last_morning !== today;
    const eveningDue =
      pref.evening_time && hhmm >= pref.evening_time && pref.last_evening !== today;
    if (!morningDue && !eveningDue) continue;

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", uid);

    const { data: log } = await admin
      .from("daily_logs")
      .select("planned_at, reviewed_at")
      .eq("user_id", uid)
      .eq("log_date", today)
      .maybeSingle();

    if (morningDue) {
      // 이미 계획했으면 보내지 않는다 (잔소리 방지)
      if (!log?.planned_at && subs && subs.length > 0) {
        const [{ count: taskDue }, { count: msDue }] = await Promise.all([
          admin
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("user_id", uid)
            .is("completed_at", null)
            .lte("due_date", today),
          admin
            .from("milestones")
            .select("id", { count: "exact", head: true })
            .eq("user_id", uid)
            .is("completed_at", null)
            .lte("due_date", today),
        ]);
        const due = (taskDue ?? 0) + (msDue ?? 0);
        const body =
          due > 0
            ? `오늘 계획을 세워볼까요? · 마감 ${due}건이 기다려요`
            : "오늘 계획을 세워볼까요?";
        await send(subs, "좋은 아침이에요", body, "/today?add=task");
        sentMorning++;
      }
      await admin
        .from("reminder_prefs")
        .update({ last_morning: today })
        .eq("user_id", uid);
    }

    if (eveningDue) {
      // 이미 마감 회고했으면 보내지 않는다
      if (!log?.reviewed_at && subs && subs.length > 0) {
        await send(
          subs,
          "하루 마무리",
          "오늘 어땠나요? 잠깐 돌아보고 마감해요.",
          "/today",
        );
        sentEvening++;
      }
      await admin
        .from("reminder_prefs")
        .update({ last_evening: today })
        .eq("user_id", uid);
    }
  }

  return NextResponse.json({ ok: true, sentMorning, sentEvening, hhmm, today });
}
