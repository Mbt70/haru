"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type DeepLinkAction = "add-task" | "gate";

// PWA 홈 화면 shortcuts(/today?add=task, /today?gate=1)를 시트 오픈으로 변환.
// 처리 후 쿼리를 지워 새로고침 시 재실행을 막는다.
export function DeepLinkHandler({
  onAction,
}: {
  onAction: (action: DeepLinkAction) => void;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("add") === "task") {
      onAction("add-task");
      router.replace(pathname);
    } else if (searchParams.get("gate") === "1") {
      onAction("gate");
      router.replace(pathname);
    }
  }, [searchParams, pathname, router, onAction]);

  return null;
}
