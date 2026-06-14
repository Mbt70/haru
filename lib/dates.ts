import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
} from "date-fns";

// "오늘"은 항상 클라이언트(사용자 기기, KST)에서 계산한다.
// Vercel 서버는 UTC이므로 서버에서 날짜를 계산하면 하루가 어긋난다.

export function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function tomorrowStr(): string {
  return format(addDays(new Date(), 1), "yyyy-MM-dd");
}

export function yesterdayStr(): string {
  return format(addDays(new Date(), -1), "yyyy-MM-dd");
}

/** 오늘부터 n일 뒤 날짜 문자열 */
export function dateAfterDays(n: number): string {
  return format(addDays(new Date(), n), "yyyy-MM-dd");
}

/** "2026-06-15" → "D-3", 오늘이면 "D-DAY", 지났으면 "D+2" */
export function dday(dateStr: string): string {
  const diff = differenceInCalendarDays(parseISO(dateStr), new Date());
  if (diff === 0) return "D-DAY";
  return diff > 0 ? `D-${diff}` : `D+${-diff}`;
}

export function ddayDiff(dateStr: string): number {
  return differenceInCalendarDays(parseISO(dateStr), new Date());
}

/** 로컬 기준 해당 날짜의 [자정, 다음날 자정) ISO 범위 — timestamptz 필터용 */
export function dayRange(dateStr: string): { start: string; end: string } {
  const start = startOfDay(parseISO(dateStr));
  return {
    start: start.toISOString(),
    end: addDays(start, 1).toISOString(),
  };
}

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** "6월 12일 목요일" */
export function formatDateHeader(date: Date = new Date()): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS_KO[date.getDay()]}요일`;
}

/** "2026-06-15" → "6월 15일 (월)" */
export function formatShortDate(dateStr: string): string {
  const d = parseISO(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS_KO[d.getDay()]})`;
}

/** timestamptz ISO → "14:20" */
export function formatTime(iso: string): string {
  return format(parseISO(iso), "HH:mm");
}

/** ISO 또는 "yyyy-MM-dd" → "오늘" / "어제" / "3일 전" / "2주 전" */
export function formatRelativeDay(value: string): string {
  const d = value.length <= 10 ? parseISO(value) : parseISO(value);
  const diff = differenceInCalendarDays(new Date(), d);
  if (diff <= 0) return "오늘";
  if (diff === 1) return "어제";
  if (diff < 7) return `${diff}일 전`;
  if (diff < 30) return `${Math.floor(diff / 7)}주 전`;
  return `${Math.floor(diff / 30)}개월 전`;
}

/**
 * 세션이 열려 있는 시간 → "방금 시작" / "37분째" / "3시간째" / "2일째 열려 있음".
 * stale=true면 너무 오래 방치된 세션(>=1일 또는 >=4시간)이라 강조 표시 대상.
 */
export function formatElapsed(iso: string): { text: string; stale: boolean } {
  // 달력 일수가 아니라 실제 경과 시간 기준 — 자정을 막 넘긴 신규 세션을
  // "1일째"로 오인하지 않게.
  const ms = Date.now() - parseISO(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return { text: "방금 시작", stale: false };
  if (mins < 60) return { text: `${mins}분째`, stale: false };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { text: `${hours}시간째`, stale: hours >= 4 };
  const days = Math.floor(hours / 24);
  return { text: `${days}일째 열려 있음`, stale: true };
}

/**
 * reviewed_at이 있는 daily_log 날짜 목록에서 오늘(또는 아직이면 어제)부터
 * 거꾸로 이어지는 연속 일수를 센다.
 */
export function consecutiveStreak(reviewedDates: string[]): number {
  const set = new Set(reviewedDates);
  let cursor = todayStr();
  if (!set.has(cursor)) {
    cursor = yesterdayStr();
    if (!set.has(cursor)) return 0;
  }
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = format(addDays(parseISO(cursor), -1), "yyyy-MM-dd");
  }
  return streak;
}
