"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, Sep, Toggle } from "@/components/ui/Bits";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { BellIcon, CheckIcon, ClockIcon, PlusIcon, ShieldIcon, TrashIcon } from "@/components/ui/Icons";
import { SUPPLEMENT_LIBRARY } from "@/lib/mock/library";
import { REMINDER_WINDOWS } from "@/lib/mock/supplements";
import { useNotificationCenter } from "@/lib/notifications/NotificationProvider";
import { useAppStore } from "@/lib/store/AppStore";
import { cx, faNumber } from "@/lib/format";
import type { DraftSupplement, Patient, ReminderWindow, SupplementDraft } from "@/types";

function emptyDraft(patientId: string): SupplementDraft {
  return { patientId, items: [], updatedAt: new Date().toISOString() };
}

/**
 * Sets dosages and reminder times, then pushes the schedule straight into the
 * client's own supplement timeline — reminders and all.
 */
export function SupplementScheduler({ patient }: { patient: Patient }) {
  const toast = useToast();
  const { doctor, dispatch } = useAppStore();
  const { notify } = useNotificationCenter();

  const [draft, setDraft] = useState<SupplementDraft>(
    () => doctor.supplements[patient.id] ?? emptyDraft(patient.id),
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const patch = (id: string, next: Partial<DraftSupplement>) =>
    setDraft((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...next } : i)) }));

  const remove = (id: string) =>
    setDraft((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));

  const add = (preset: Omit<DraftSupplement, "id">) =>
    setDraft((d) => ({
      ...d,
      items: [...d.items, { ...preset, id: `sup_${Date.now()}_${d.items.length}` }],
    }));

  const save = () => {
    const next = { ...draft, updatedAt: new Date().toISOString() };
    setDraft(next);
    dispatch({ type: "doctor/saveSupplements", draft: next });
    toast.success("برنامه مکمل ذخیره شد.");
  };

  /** The bridge the brief asks for: schedule → the client's live timeline. */
  const publish = () => {
    if (draft.items.length === 0) {
      toast.error("ابتدا حداقل یک مکمل یا دارو اضافه کنید.");
      return;
    }
    const next = { ...draft, updatedAt: new Date().toISOString() };
    setDraft(next);
    dispatch({ type: "doctor/publishSupplements", draft: next });

    const withReminders = next.items.filter((i) => i.reminderOn).length;
    void notify({
      channel: "supplements",
      title: "برنامه مکمل جدید دریافت شد 💊",
      body: `${faNumber(next.items.length)} مورد از ${patient.firstName ? "مشاور شما" : "مشاور"} — ${faNumber(withReminders)} یادآور فعال.`,
      url: "/plans?tab=supplements",
      key: `publish:${Date.now()}`,
    });

    toast.success(
      `${faNumber(next.items.length)} مورد به تایم‌لاین ${patient.firstName} اضافه شد و یادآورها فعال شدند.`,
    );
  };

  const reminders = draft.items.filter((i) => i.reminderOn).length;

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-primary-50 text-primary-700">
          <BellIcon width={19} height={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-ink">زمان‌بندی مکمل و دارو</p>
          <p className="mt-0.5 text-2xs text-ink-muted">
            {faNumber(draft.items.length)} مورد
            <Sep />
            {faNumber(reminders)} یادآور فعال
          </p>
        </div>
      </Card>

      {draft.items.length === 0 && (
        <Card className="py-8 text-center">
          <p className="text-2xs text-ink-soft">هنوز مکملی به برنامه اضافه نشده است.</p>
        </Card>
      )}

      {REMINDER_WINDOWS.map((window) => {
        const items = draft.items.filter((i) => i.window === window.key);
        if (items.length === 0) return null;

        return (
          <section key={window.key} className="flex flex-col gap-2">
            <header className="flex items-center gap-2 px-1">
              <span aria-hidden="true">{window.icon}</span>
              <h3 className="text-xs font-extrabold text-ink">{window.label}</h3>
              <span className="text-2xs text-ink-soft">{window.timeRange}</span>
            </header>

            {items.map((item) => (
              <motion.div key={item.id} layout className="app-card p-3.5">
                <div className="flex items-start gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-extrabold text-ink">{item.name}</p>
                      {item.kind === "medicine" && (
                        <span className="flex shrink-0 items-center gap-0.5 rounded-pill bg-danger-50 px-1.5 py-0.5 text-[0.55rem] font-bold text-danger-600">
                          <ShieldIcon width={9} height={9} />
                          دارو
                        </span>
                      )}
                    </div>
                    {item.latinName && (
                      <p className="mt-0.5 truncate text-2xs text-ink-soft">{item.latinName}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Toggle
                      checked={item.reminderOn}
                      label={`یادآور ${item.name}`}
                      onChange={() => patch(item.id, { reminderOn: !item.reminderOn })}
                    />
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      aria-label={`حذف ${item.name}`}
                      className="tap-target grid h-8 w-8 place-items-center rounded-pill text-danger-600"
                    >
                      <TrashIcon width={15} height={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-col gap-2">
                  <Field label="دوز مصرف">
                    <input
                      value={item.dosage}
                      onChange={(e) => patch(item.id, { dosage: e.target.value })}
                      className="w-full rounded-card border border-line bg-canvas px-2.5 py-1.5 text-2xs text-ink outline-none focus:border-primary-500"
                    />
                  </Field>

                  <div className="flex gap-2">
                    <Field label="ساعت">
                      <input
                        value={item.timeLabel}
                        onChange={(e) => patch(item.id, { timeLabel: e.target.value })}
                        placeholder="۸:۰۰"
                        className="w-full rounded-card border border-line bg-canvas px-2.5 py-1.5 text-2xs text-ink outline-none focus:border-primary-500"
                      />
                    </Field>
                    <Field label="بازه">
                      <select
                        value={item.window}
                        onChange={(e) => patch(item.id, { window: e.target.value as ReminderWindow })}
                        className="w-full rounded-card border border-line bg-canvas px-2.5 py-1.5 text-2xs text-ink outline-none focus:border-primary-500"
                      >
                        {REMINDER_WINDOWS.map((w) => (
                          <option key={w.key} value={w.key}>
                            {w.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => patch(item.id, { withFood: !item.withFood })}
                      className={cx(
                        "app-chip",
                        item.withFood && "app-chip-active",
                      )}
                    >
                      {item.withFood ? "همراه غذا" : "ناشتا / بدون غذا"}
                    </button>
                    <span className="flex items-center gap-1 text-[0.6rem] text-ink-soft">
                      <ClockIcon width={10} height={10} />
                      {item.timeLabel || "بدون ساعت"}
                    </span>
                  </div>

                  <input
                    value={item.note}
                    onChange={(e) => patch(item.id, { note: e.target.value })}
                    placeholder="توضیح برای مراجع…"
                    className="w-full rounded-card border border-line bg-canvas px-2.5 py-1.5 text-2xs text-ink outline-none placeholder:text-ink-soft focus:border-primary-500"
                  />
                </div>
              </motion.div>
            ))}
          </section>
        );
      })}

      <button type="button" onClick={() => setPickerOpen(true)} className="app-btn-ghost w-full">
        <PlusIcon width={17} height={17} />
        افزودن مکمل یا دارو
      </button>

      <div className="flex gap-2">
        <button type="button" onClick={save} className="app-btn-ghost flex-1">
          ذخیره پیش‌نویس
        </button>
        <button type="button" onClick={publish} className="app-btn-primary flex-1">
          <CheckIcon width={17} height={17} />
          ارسال به تایم‌لاین
        </button>
      </div>

      <p className="rounded-card bg-canvas px-3 py-2.5 text-2xs leading-5 text-ink-muted">
        «ارسال به تایم‌لاین» این زمان‌بندی را جایگزین برنامه‌ی فعلی مراجع می‌کند و یادآورهای فعال
        بلافاصله در برنامه‌ی او زمان‌بندی می‌شوند.
      </p>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="کتابخانه مکمل و دارو">
        <ul className="flex flex-col gap-2 pb-2">
          {SUPPLEMENT_LIBRARY.map((preset) => (
            <li key={preset.name}>
              <button
                type="button"
                onClick={() => {
                  add(preset);
                  setPickerOpen(false);
                }}
                aria-label={`افزودن ${preset.name}`}
                className="flex w-full items-center gap-2.5 rounded-card border border-line bg-surface p-3 text-right active:bg-canvas"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-bold text-ink">{preset.name}</span>
                    {preset.kind === "medicine" && (
                      <span className="shrink-0 rounded-pill bg-danger-50 px-1.5 py-0.5 text-[0.55rem] font-bold text-danger-600">
                        دارو
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-2xs text-ink-muted">
                    {preset.dosage}
                    <Sep />
                    {preset.timeLabel}
                  </span>
                </span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-primary-50 text-primary-700">
                  <PlusIcon width={15} height={15} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex-1">
      <span className="mb-1 block text-[0.6rem] text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
