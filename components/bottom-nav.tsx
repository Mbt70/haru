"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListTodo, Plus, Sparkles, Sun, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const LEFT_ITEMS = [
  { href: "/today", label: "오늘", icon: Sun },
  { href: "/tasks", label: "할 일", icon: ListTodo },
] as const;

const RIGHT_ITEMS = [
  { href: "/goals", label: "목표", icon: Target },
  { href: "/sessions", label: "세션", icon: Sparkles },
] as const;

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Sun;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-full flex-col items-center justify-center gap-1 text-[11px]",
        active ? "text-foreground font-medium" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
      {label}
    </Link>
  );
}

export function BottomNav({ onQuickAdd }: { onQuickAdd: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
        {LEFT_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            active={pathname.startsWith(item.href)}
          />
        ))}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onQuickAdd}
            aria-label="퀵 추가"
            className="flex size-12 -translate-y-3 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
          >
            <Plus className="size-6" />
          </button>
        </div>
        {RIGHT_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            active={pathname.startsWith(item.href)}
          />
        ))}
      </div>
    </nav>
  );
}
