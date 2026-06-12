"use client";

import { Suspense, useCallback, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { QuickAddSheet, type QuickAddTab } from "@/components/quick-add-sheet";
import {
  DeepLinkHandler,
  type DeepLinkAction,
} from "@/components/deep-link-handler";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddTab, setQuickAddTab] = useState<QuickAddTab>("task");

  const openQuickAdd = useCallback((tab: QuickAddTab) => {
    setQuickAddTab(tab);
    setQuickAddOpen(true);
  }, []);

  const handleDeepLink = useCallback(
    (action: DeepLinkAction) => {
      openQuickAdd(action === "gate" ? "session" : "task");
    },
    [openQuickAdd],
  );

  return (
    <>
      <Suspense fallback={null}>
        <DeepLinkHandler onAction={handleDeepLink} />
      </Suspense>
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-28 pt-6">
        {children}
      </main>
      <BottomNav onQuickAdd={() => openQuickAdd("task")} />
      <QuickAddSheet
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        defaultTab={quickAddTab}
      />
    </>
  );
}
