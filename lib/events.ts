"use client";

import { useEffect } from "react";

// 전역 퀵추가 시트 등에서 데이터가 바뀌면 열려 있는 페이지들이 다시 불러오도록
// 하는 아주 가벼운 신호. 상태 라이브러리 없이 CustomEvent 하나로 해결한다.

const EVENT = "haru:data-changed";

export type ChangedTable =
  | "tasks"
  | "daily_logs"
  | "ai_sessions"
  | "goals"
  | "milestones";

export function emitDataChanged(table: ChangedTable) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: table }));
}

/** handler는 useCallback으로 감싸 안정적인 참조를 넘길 것 */
export function useDataChanged(handler: (table: ChangedTable) => void) {
  useEffect(() => {
    const fn = (e: Event) => handler((e as CustomEvent<ChangedTable>).detail);
    window.addEventListener(EVENT, fn);
    return () => window.removeEventListener(EVENT, fn);
  }, [handler]);
}
