import { NextResponse } from "next/server";
import webpush from "web-push";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:noreply@example.com";
  if (!publicKey || !privateKey) {
    return NextResponse.json(
      { error: "VAPID 키가 서버에 설정되지 않았어요" },
      { status: 500 },
    );
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", user.id);
  if (!subs || subs.length === 0) {
    return NextResponse.json({ error: "구독된 기기가 없어요" }, { status: 400 });
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const payload = JSON.stringify({
    title: "하루",
    body: "알림이 정상적으로 도착했어요 🎉",
    url: "/today",
    tag: "test",
  });

  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (err: unknown) {
        // 만료(404/410)된 구독은 정리
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    }),
  );

  return NextResponse.json({ sent });
}
