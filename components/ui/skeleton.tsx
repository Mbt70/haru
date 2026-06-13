import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

/** 리스트 로딩 시 레이아웃 점프를 막는 행 스켈레톤 묶음 */
function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 flex-1" style={{ maxWidth: `${70 - i * 8}%` }} />
        </div>
      ))}
    </div>
  );
}

export { Skeleton, ListSkeleton };
