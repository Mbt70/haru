"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Moon, CheckCircle2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReviewCard({
  evening,
  onClick,
}: {
  evening: boolean;
  onClick: () => void;
}) {
  return (
    <Card className={cn(evening && "border-primary/50")}>
      <CardContent className="flex items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3">
          <Moon
            className={cn(
              "size-5",
              evening ? "text-primary" : "text-muted-foreground",
            )}
            strokeWidth={1.8}
          />
          <div>
            <p className="text-sm font-medium">하루 마무리</p>
            <p className="text-xs text-muted-foreground">
              완료한 일을 돌아보고 남은 일을 정리해요
            </p>
          </div>
        </div>
        <Button
          variant={evening ? "default" : "outline"}
          size="sm"
          onClick={onClick}
        >
          마감하기
        </Button>
      </CardContent>
    </Card>
  );
}

export function DoneFooter({
  reflection,
  onEdit,
}: {
  reflection: string | null;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-2 rounded-xl bg-muted px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <CheckCircle2 className="size-4 text-primary" />
          오늘 마감 완료
        </p>
        <button
          type="button"
          onClick={onEdit}
          aria-label="회고 수정"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
      {reflection && (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {reflection}
        </p>
      )}
    </div>
  );
}
