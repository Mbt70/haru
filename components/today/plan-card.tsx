"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sunrise, Pencil } from "lucide-react";

export function PlanCard({ onClick }: { onClick: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
        <Sunrise className="size-8 text-muted-foreground" strokeWidth={1.5} />
        <div className="space-y-1">
          <p className="font-medium">아직 오늘 계획이 없어요</p>
          <p className="text-sm text-muted-foreground">
            오늘 할 일을 고르고 한 줄 포커스를 정해보세요
          </p>
        </div>
        <Button onClick={onClick}>오늘 계획하기</Button>
      </CardContent>
    </Card>
  );
}

export function FocusBanner({
  focus,
  onEdit,
}: {
  focus: string | null;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-primary px-4 py-3 text-primary-foreground">
      <p className="min-w-0 flex-1 text-sm font-medium">
        {focus ? focus : "오늘 계획 완료"}
      </p>
      <button
        type="button"
        onClick={onEdit}
        aria-label="계획 수정"
        className="opacity-70 transition-opacity hover:opacity-100"
      >
        <Pencil className="size-3.5" />
      </button>
    </div>
  );
}
