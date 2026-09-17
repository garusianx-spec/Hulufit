"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AppShell, NavSpacer } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { PullToRefresh } from "@/components/layout/PullToRefresh";
import { PlansTabs, type PlansTab } from "@/components/plans/PlansTabs";
import { DietPlanView } from "@/components/plans/DietPlanView";
import { WorkoutPlanView } from "@/components/plans/WorkoutPlanView";
import { SupplementsView } from "@/components/plans/SupplementsView";
import { Skeleton } from "@/components/ui/Bits";

const ORDER: PlansTab[] = ["diet", "workout", "supplements"];

function PlansScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = (params.get("tab") as PlansTab) || "diet";

  const [tab, setTab] = useState<PlansTab>(ORDER.includes(initial) ? initial : "diet");
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const next = params.get("tab") as PlansTab | null;
    if (next && ORDER.includes(next) && next !== tab) setTab(next);
    // Deep links from the dashboard drive the sub-tab.
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = useCallback(
    (next: PlansTab) => {
      setDirection(ORDER.indexOf(next) > ORDER.indexOf(tab) ? 1 : -1);
      setTab(next);
      router.replace(`/plans?tab=${next}`, { scroll: false });
    },
    [router, tab],
  );

  const refresh = async () => {
    // Production: refetch the active plan revision from the coach service.
    await new Promise((r) => setTimeout(r, 800));
  };

  return (
    <AppShell
      header={
        <AppHeader variant="brand">
          <PlansTabs active={tab} onChange={change} />
        </AppHeader>
      }
    >
      <PullToRefresh onRefresh={refresh}>
        <div className="pt-3">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={tab}
              custom={direction}
              /* RTL: a "next" tab enters from the left. */
              initial={{ opacity: 0, x: direction > 0 ? -24 : 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? 24 : -24 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {tab === "diet" && <DietPlanView />}
              {tab === "workout" && <WorkoutPlanView />}
              {tab === "supplements" && <SupplementsView />}
            </motion.div>
          </AnimatePresence>
        </div>
        <NavSpacer />
      </PullToRefresh>
    </AppShell>
  );
}

export default function PlansPage() {
  return (
    <Suspense fallback={<PlansSkeleton />}>
      <PlansScreen />
    </Suspense>
  );
}

function PlansSkeleton() {
  return (
    <AppShell header={<AppHeader variant="brand" />}>
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-10 w-full rounded-pill" />
        <Skeleton className="h-36 w-full rounded-card" />
        <Skeleton className="h-24 w-full rounded-card" />
        <Skeleton className="h-24 w-full rounded-card" />
      </div>
    </AppShell>
  );
}
