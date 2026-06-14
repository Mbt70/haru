"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  currentSubscription,
  disablePush,
  enablePush,
  pushSupported,
} from "@/lib/push";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Bell, BellOff, BookOpen, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [morning, setMorning] = useState("");
  const [evening, setEvening] = useState("");
  const [savingTimes, setSavingTimes] = useState(false);

  useEffect(() => {
    (async () => {
      const ok = pushSupported();
      setSupported(ok);
      if (ok) {
        setDenied(Notification.permission === "denied");
        const sub = await currentSubscription();
        setEnabled(!!sub);
      }
      const { data } = await supabase
        .from("reminder_prefs")
        .select("morning_time, evening_time")
        .maybeSingle();
      if (data) {
        setMorning(data.morning_time ?? "");
        setEvening(data.evening_time ?? "");
      }
      setReady(true);
    })();
  }, [supabase]);

  async function saveTimes() {
    setSavingTimes(true);
    const { error } = await supabase.from("reminder_prefs").upsert(
      {
        morning_time: morning || null,
        evening_time: evening || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    setSavingTimes(false);
    if (error) {
      toast.error("저장에 실패했어요");
      return;
    }
    toast.success("알림 시간을 저장했어요");
  }

  async function turnOn() {
    setBusy(true);
    try {
      const ok = await enablePush();
      if (ok) {
        setEnabled(true);
        toast.success("알림을 켰어요");
      } else {
        setDenied(Notification.permission === "denied");
        toast.error("알림 권한이 허용되지 않았어요");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "알림 설정에 실패했어요");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      await disablePush();
      setEnabled(false);
      toast("알림을 껐어요");
    } catch {
      toast.error("해제에 실패했어요");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const json = await res.json();
      if (res.ok) toast.success(`테스트 알림을 보냈어요 (${json.sent}건)`);
      else toast.error(json.error ?? "전송에 실패했어요");
    } catch {
      toast.error("전송에 실패했어요");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild aria-label="뒤로">
          <Link href="/today">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">설정</h1>
      </header>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-medium text-muted-foreground">알림</h2>
        <Card>
          <CardContent className="space-y-3 py-4">
            {!ready ? (
              <p className="text-sm text-muted-foreground">불러오는 중...</p>
            ) : !supported ? (
              <p className="text-sm text-muted-foreground">
                이 브라우저는 푸시 알림을 지원하지 않아요. 홈 화면에 설치한 앱
                (PWA)에서 열어보세요.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  {enabled ? (
                    <Bell className="size-5 text-primary" />
                  ) : (
                    <BellOff className="size-5 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      푸시 알림 {enabled ? "켜짐" : "꺼짐"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      아침 계획·저녁 회고·마감을 폰으로 알려드려요
                    </p>
                  </div>
                  {enabled ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={turnOff}
                      disabled={busy}
                    >
                      끄기
                    </Button>
                  ) : (
                    <Button size="sm" onClick={turnOn} disabled={busy || denied}>
                      켜기
                    </Button>
                  )}
                </div>
                {denied && (
                  <p className="text-xs text-destructive">
                    브라우저에서 알림이 차단돼 있어요. 사이트 설정에서 알림을
                    허용해주세요.
                  </p>
                )}
                {enabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={sendTest}
                    disabled={busy}
                  >
                    테스트 알림 보내기
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {ready && supported && enabled && (
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-medium text-muted-foreground">
            알림 시간
          </h2>
          <Card>
            <CardContent className="space-y-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="morning">아침 계획 알림</Label>
                  <p className="text-xs text-muted-foreground">
                    아직 계획을 안 세웠으면 이 시각에 알려줘요
                  </p>
                </div>
                <Input
                  id="morning"
                  type="time"
                  value={morning}
                  onChange={(e) => setMorning(e.target.value)}
                  className="w-32"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="evening">저녁 회고 알림</Label>
                  <p className="text-xs text-muted-foreground">
                    아직 마감을 안 했으면 이 시각에 알려줘요
                  </p>
                </div>
                <Input
                  id="evening"
                  type="time"
                  value={evening}
                  onChange={(e) => setEvening(e.target.value)}
                  className="w-32"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                비워두면 해당 알림은 꺼져요. (시각은 한국 시간 기준)
              </p>
              <Button
                className="w-full"
                onClick={saveTimes}
                disabled={savingTimes}
              >
                알림 시간 저장
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-medium text-muted-foreground">기록</h2>
        <Button variant="outline" className="w-full justify-start" asChild>
          <Link href="/reflections">
            <BookOpen className="size-4" />
            회고 기록 모아보기
          </Link>
        </Button>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-medium text-muted-foreground">계정</h2>
        <Button
          variant="outline"
          className="w-full justify-start text-destructive"
          onClick={signOut}
        >
          <LogOut className="size-4" />
          로그아웃
        </Button>
      </section>
    </div>
  );
}
