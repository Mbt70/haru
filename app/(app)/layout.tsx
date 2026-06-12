"use client";

import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-28 pt-6">
        {children}
      </main>
      <BottomNav onQuickAdd={() => toast("퀵 추가는 다음 단계에서 열려요")} />
    </>
  );
}
