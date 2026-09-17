"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell, NavSpacer } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { PullToRefresh } from "@/components/layout/PullToRefresh";
import { Avatar, Card, Section, Sep } from "@/components/ui/Bits";
import { ComplianceRing } from "@/components/today/ComplianceRing";
import { NotificationPermissionCard } from "@/components/notifications/NotificationPermissionCard";
import { EnergyCard } from "@/components/today/EnergyCard";
import { WaterLogger } from "@/components/today/WaterLogger";
import { WeightQuickLog } from "@/components/today/WeightQuickLog";
import { ChatIcon, ChevronLeft, DumbbellIcon, PillIcon } from "@/components/ui/Icons";
import { useAppStore } from "@/lib/store/AppStore";
import { chatThread } from "@/lib/mock/chat";
import { workoutPlan } from "@/lib/mock/workouts";
import { faNumber, faDate, persianWeekdayIndex, WEEKDAYS_FA } from "@/lib/format";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 320, damping: 30 } },
};

export default function TodayPage() {
  const { user, today, compliance, supplements } = useAppStore();

  const dayIndex = persianWeekdayIndex();
  const todayWorkout = workoutPlan.days.find((d) => d.dayIndex === dayIndex) ?? workoutPlan.days[0];
  const pendingSupplements = supplements.filter((s) => !s.takenAt).length;

  const refresh = async () => {
    // Production: revalidate today's log, plan and unread counters.
    await new Promise((r) => setTimeout(r, 800));
  };

  return (
    <AppShell header={<AppHeader />}>
      <PullToRefresh onRefresh={refresh}>
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4 pt-4">
          {/* Greeting */}
          <motion.div variants={item} className="flex items-center gap-3 px-4">
            <Avatar src={user.avatarUrl} name={`${user.firstName} ${user.lastName}`} size={46} ring />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-ink">
                سلام {user.firstName} جان 👋
              </p>
              <p className="text-2xs text-ink-muted">
                {WEEKDAYS_FA[dayIndex]}
                <Sep />
                {faDate(new Date())}
                <Sep />
                {faNumber(today.steps)} قدم
              </p>
            </div>
            <Link
              href={`/chat/${chatThread.id}`}
              aria-label="گفتگو با مشاور"
              className="tap-target relative grid h-10 w-10 place-items-center rounded-pill bg-primary-50 text-primary-700"
            >
              <ChatIcon width={20} height={20} />
              <span className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-danger-500 ring-2 ring-surface" />
            </Link>
          </motion.div>

          {/* Notification soft-ask (or the denied / iOS fallback) */}
          <motion.div variants={item}>
            <NotificationPermissionCard />
          </motion.div>

          {/* Compliance ring */}
          <motion.div variants={item} className="px-4">
            <Card>
              <ComplianceRing
                overall={compliance.overall}
                meals={compliance.meals}
                workout={compliance.workout}
                water={compliance.water}
              />
            </Card>
          </motion.div>

          <motion.div variants={item} className="px-4">
            <EnergyCard />
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-1 gap-3 px-4">
            <WaterLogger />
          </motion.div>

          <motion.div variants={item} className="px-4">
            <WeightQuickLog />
          </motion.div>

          {/* Up next */}
          <motion.div variants={item}>
            <Section title="ادامه‌ی امروز">
              <div className="flex flex-col gap-2.5">
                <Link href="/plans?tab=workout">
                  <Card className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-pill bg-sky-50 text-sky-600">
                      <DumbbellIcon width={20} height={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{todayWorkout.title}</p>
                      <p className="text-2xs text-ink-muted">
                        {todayWorkout.isRestDay
                          ? "امروز روز استراحت است"
                          : `${faNumber(todayWorkout.durationMin)} دقیقه — حدود ${faNumber(todayWorkout.estimatedBurn)} کالری`}
                      </p>
                    </div>
                    <ChevronLeft width={18} height={18} className="text-ink-soft" />
                  </Card>
                </Link>

                <Link href="/plans?tab=supplements">
                  <Card className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-pill bg-primary-50 text-primary-700">
                      <PillIcon width={20} height={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">یادآور مکمل و دارو</p>
                      <p className="text-2xs text-ink-muted">
                        {pendingSupplements > 0
                          ? `${faNumber(pendingSupplements)} مورد باقی‌مانده برای امروز`
                          : "همه‌ی موارد امروز ثبت شد ✅"}
                      </p>
                    </div>
                    <ChevronLeft width={18} height={18} className="text-ink-soft" />
                  </Card>
                </Link>
              </div>
            </Section>
          </motion.div>

          {/* Coach strip */}
          <motion.div variants={item}>
            <Section title="مشاور شما">
              <Link href={`/chat/${chatThread.id}`}>
                <Card className="flex items-center gap-3">
                  <Avatar name={chatThread.specialistName} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{chatThread.specialistName}</p>
                    <p className="truncate text-2xs text-ink-muted">{chatThread.specialistTitle}</p>
                  </div>
                  <span className="app-chip app-chip-active">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-600" />
                    آنلاین
                  </span>
                </Card>
              </Link>
            </Section>
          </motion.div>
        </motion.div>
        <NavSpacer />
      </PullToRefresh>
    </AppShell>
  );
}
