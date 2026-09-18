"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  CohortHeatmap,
  RankedBars,
  SERIES,
  StatTile,
  TrendPanel,
  faTomanShort,
} from "@/components/admin/charts";
import { Sep } from "@/components/ui/Bits";
import {
  adminOverview,
  adminSpecialists,
  adminTrend,
  retentionCohorts,
} from "@/lib/mock/admin";
import { faNumber } from "@/lib/format";

export default function AdminOverviewPage() {
  const o = adminOverview;

  return (
    <AdminShell
      title="نمای کلی سامانه"
      subtitle="شاخص‌های کلیدی، روند ۱۲ هفته و عملکرد متخصصین"
    >
      <div className="flex flex-col gap-4">
        {/* KPI row — the number is the chart. */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="کاربران فعال"
            value={faNumber(o.users.active)}
            delta={8.4}
            deltaLabel="نسبت به هفته قبل"
            tone="primary"
          />
          <StatTile
            label="مشاوره‌های این هفته"
            value={faNumber(o.consultations.thisWeek)}
            delta={5.1}
            deltaLabel="نسبت به هفته قبل"
            tone="sky"
          />
          <StatTile
            label="درآمد این ماه"
            value={faTomanShort(o.revenue.thisMonthToman)}
            unit="تومان"
            delta={12.7}
            deltaLabel="نسبت به ماه قبل"
          />
          <StatTile
            label="ماندگاری ۳۰ روزه"
            value={`${faNumber(o.retention.d30 * 100, 0)}٪`}
            delta={-1.8}
            deltaLabel="نسبت به کوهورت قبل"
            tone="amber"
          />
        </section>

        {/* Three measures, three scales — small multiples, never a dual axis. */}
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <TrendPanel
            title="کاربران فعال هفتگی"
            color={SERIES.primary}
            points={adminTrend.map((t) => ({ label: t.week, value: t.activeUsers }))}
            formatValue={(n) => faNumber(n)}
          />
          <TrendPanel
            title="مشاوره‌های هفتگی"
            color={SERIES.sky}
            points={adminTrend.map((t) => ({ label: t.week, value: t.consultations }))}
            formatValue={(n) => faNumber(n)}
          />
          <TrendPanel
            title="درآمد هفتگی"
            color={SERIES.amber}
            points={adminTrend.map((t) => ({ label: t.week, value: t.revenueToman }))}
            formatValue={(n) => `${faTomanShort(n)} تومان`}
          />
        </section>

        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <CohortHeatmap cohorts={retentionCohorts} />

          <RankedBars
            title="درآمد متخصصین (تومان)"
            rows={[...adminSpecialists]
              .filter((s) => s.payoutToman > 0)
              .sort((a, b) => b.payoutToman - a.payoutToman)
              .map((s) => ({
                id: s.id,
                label: s.name,
                value: s.payoutToman,
                meta: `${faNumber(s.clients)} مراجع · میانگین پاسخ ${faNumber(s.responseMinutes)} دقیقه`,
              }))}
            formatValue={(n) => faTomanShort(n)}
          />
        </section>

        {/* Secondary figures — a table, because the values matter more than shape. */}
        <section className="app-card p-4">
          <p className="text-xs font-extrabold text-ink">خلاصه مالی و عملیاتی</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
            <Figure label="درآمد ناخالص کل" value={`${faTomanShort(o.revenue.grossToman)} تومان`} />
            <Figure label="کمیسیون پلتفرم" value={`${faTomanShort(o.revenue.commissionToman)} تومان`} />
            <Figure label="بازپرداخت‌ها" value={`${faTomanShort(o.revenue.refundsToman)} تومان`} />
            <Figure label="گفتگوهای باز" value={faNumber(o.consultations.openThreads)} />
            <Figure label="کل کاربران" value={faNumber(o.users.total)} />
            <Figure label="ثبت‌نام این هفته" value={faNumber(o.users.newThisWeek)} />
            <Figure label="ریزش این هفته" value={faNumber(o.users.churnedThisWeek)} />
            <Figure
              label="میانگین زمان پاسخ"
              value={`${faNumber(o.consultations.avgResponseMinutes)} دقیقه`}
            />
          </dl>
          <p className="mt-3 text-2xs text-ink-soft">
            داده‌ها از سرویس تحلیل خوانده می‌شود
            <Sep />
            آخرین به‌روزرسانی: چند لحظه پیش
          </p>
        </section>
      </div>
    </AdminShell>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-2xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-extrabold text-ink">{value}</dd>
    </div>
  );
}
