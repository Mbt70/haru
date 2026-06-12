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
