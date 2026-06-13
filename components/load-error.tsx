"use client";

import { Button } from "@/components/ui/button";
import { CloudOff } from "lucide-react";

/**
 * 데이터를 못 불러왔을 때 빈 상태("아직 없어요") 대신 보여주는 공용 에러 + 재시도.
 * 무료 티어 Supabase가 잠들면 첫 요청이 실패할 수 있어, 데이터가 사라진 듯
 * 보이지 않게 한다.
 */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <CloudOff className="size-7 text-muted-foreground" strokeWidth={1.5} />
      <div className="space-y-0.5">
        <p className="text-sm font-medium">연결에 실패했어요</p>
        <p className="text-xs text-muted-foreground">
          데이터는 안전해요. 잠시 후 다시 시도해보세요.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  );
}
