"use client";

import { motion } from "framer-motion";
import { Card, CheckBubble, ProgressBar, Toggle } from "@/components/ui/Bits";
import { BellIcon, ClockIcon, PillIcon, ShieldIcon } from "@/components/ui/Icons";
import { REMINDER_WINDOWS } from "@/lib/mock/supplements";
import { useAppStore } from "@/lib/store/AppStore";
import { cx, faNumber, faTime } from "@/lib/format";
import type { SupplementItem } from "@/types";

/**
 * Sub-tab 3 — یادآور مکمل و دارو.
 * Time-based windows, dosage specs, auto-timestamped completion, per-item
 * reminder toggle (maps to a scheduled local notification in the TWA).
 */
export function SupplementsView() {
  const { supplements, dispatch } = useAppStore();

  const taken = supplements.filter((s) => s.takenAt).length;
  const remindersOn = supplements.filter((s) => s.reminderOn).length;

  return (
    <div className="flex flex-col gap-3 px-4">
      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-pill bg-primary-50 text-primary-700">
            <PillIcon width={20} height={20} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-extrabold text-ink">یادآور مکمل و دارو</p>
            <p className="mt-0.5 text-2xs text-ink-muted">
              {faNumber(remindersOn)} یادآور فعال از {faNumber(supplements.length)} مورد
            </p>
          </div>
          <div className="text-left">
            <p className="text-lg font-extrabold leading-none text-primary-700">
              {faNumber(taken)}
              <span className="text-2xs font-medium text-ink-soft">/{faNumber(supplements.length)}</span>
            </p>
            <p className="mt-0.5 text-2xs text-ink-muted">مصرف‌شده</p>
          </div>
        </div>
        <ProgressBar value={(taken / supplements.length) * 100} height={9} />
      </Card>

      {REMINDER_WINDOWS.map((window) => {
        const items = supplements.filter((s) => s.window === window.key);
        if (items.length === 0) return null;
        const windowTaken = items.filter((i) => i.takenAt).length;

        return (
          <section key={window.key} className="flex flex-col gap-2">
            <header className="flex items-center gap-2 px-1 pt-1">
              <span aria-hidden="true">{window.icon}</span>
              <h3 className="text-xs font-extrabold text-ink">{window.label}</h3>
              <span className="text-2xs text-ink-soft">{window.timeRange}</span>
              <span
                className={cx(
                  "mr-auto rounded-pill px-2 py-0.5 text-2xs font-bold",
                  windowTaken === items.length
                    ? "bg-primary-50 text-primary-700"
                    : "bg-canvas text-ink-muted",
                )}
              >
                {faNumber(windowTaken)}/{faNumber(items.length)}
              </span>
            </header>

            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <SupplementRow
                  key={item.id}
                  item={item}
                  onToggleTaken={() => dispatch({ type: "supplement/toggleTaken", id: item.id })}
                  onToggleReminder={() => dispatch({ type: "supplement/toggleReminder", id: item.id })}
                />
              ))}
            </div>
          </section>
        );
      })}

      <p className="rounded-card border border-warn-100 bg-warn-50 px-3 py-2.5 text-2xs leading-5 text-warn-600">
        ⚠️ داروها را بدون هماهنگی با پزشک معالج قطع یا جایگزین نکنید. این بخش فقط نقش یادآور دارد.
      </p>
    </div>
  );
}

function SupplementRow({
  item,
  onToggleTaken,
  onToggleReminder,
}: {
  item: SupplementItem;
  onToggleTaken: () => void;
  onToggleReminder: () => void;
}) {
  const isMedicine = item.kind === "medicine";

  return (
    <motion.div layout className={cx("app-card p-3.5", item.takenAt && "bg-primary-50/40")}>
      <div className="flex items-start gap-3">
        <CheckBubble checked={Boolean(item.takenAt)} label={`مصرف ${item.name}`} onChange={onToggleTaken} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p
              className={cx(
                "truncate text-xs font-extrabold",
                item.takenAt ? "text-ink-soft line-through" : "text-ink",
              )}
            >
              {item.name}
            </p>
            {isMedicine && (
              <span className="flex shrink-0 items-center gap-0.5 rounded-pill bg-danger-50 px-1.5 py-0.5 text-[0.55rem] font-bold text-danger-600">
                <ShieldIcon width={10} height={10} />
                دارو
              </span>
            )}
          </div>

          {item.latinName && <p className="mt-0.5 truncate text-2xs text-ink-soft">{item.latinName}</p>}

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-pill bg-canvas px-2 py-0.5 text-[0.6rem] font-bold text-ink">
              {item.dosage}
            </span>
            <span className="flex items-center gap-1 rounded-pill bg-canvas px-2 py-0.5 text-[0.6rem] text-ink-muted">
              <ClockIcon width={10} height={10} />
              {item.timeLabel}
            </span>
            <span className="rounded-pill bg-canvas px-2 py-0.5 text-[0.6rem] text-ink-muted">
              {item.withFood ? "همراه غذا" : "ناشتا / بدون غذا"}
            </span>
          </div>

          {item.note && <p className="mt-1.5 text-2xs leading-4 text-ink-muted">{item.note}</p>}

          {/* Auto-timestamp written the moment the checkbox is ticked. */}
          {item.takenAt && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1.5 text-2xs font-bold text-primary-700"
            >
              ✓ ثبت شد در ساعت {faTime(item.takenAt)}
            </motion.p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
          <Toggle
            checked={item.reminderOn}
            onChange={onToggleReminder}
            label={`یادآور ${item.name}`}
          />
          <span
            className={cx(
              "flex items-center gap-0.5 text-[0.55rem]",
              item.reminderOn ? "text-primary-700" : "text-ink-soft",
            )}
          >
            <BellIcon width={9} height={9} />
            یادآور
          </span>
        </div>
      </div>
    </motion.div>
  );
}
