"use client";

import { Suspense, useCallback, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { QuickAddSheet } from "@/components/quick-add-sheet";
import {
  DeepLinkHandler,
  type DeepLinkAction,
} from "@/components/deep-link-handler";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const handleDeepLink = useCallback((action: DeepLinkAction) => {
    if (action === "add-task") setQuickAddOpen(true);
    // "gate"는 M3(AI 세션 탭)에서 연결
    if (action === "gate") setQuickAddOpen(true);
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <DeepLinkHandler onAction={handleDeepLink} />
      </Suspense>
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-28 pt-6">
        {children}
      </main>
      <BottomNav onQuickAdd={() => setQuickAddOpen(true)} />
      <QuickAddSheet open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </>
  );
}
