"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/components/ui/Bits";
import { BellIcon, CloseIcon, ShieldIcon } from "@/components/ui/Icons";
import { useNotificationCenter } from "@/lib/notifications/NotificationProvider";

/**
 * Soft ask. Browsers permanently block a site that calls
 * `Notification.requestPermission()` on load, so the native prompt is only
 * reached from this button — an explicit user gesture, after the value is
 * explained. Denial is not a dead end: the copy points at the in-app inbox.
 */
export function NotificationPermissionCard() {
  const { supported, iosTab, permission, request, promptDismissed, dismissPrompt } =
    useNotificationCenter();

  const showAsk = supported && !iosTab && permission === "default" && !promptDismissed;
  const showDenied = supported && permission === "denied" && !promptDismissed;
  const showIos = iosTab && !promptDismissed;

  return (
    <AnimatePresence initial={false}>
      {(showAsk || showDenied || showIos) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden px-4"
        >
          <Card
            className={
              showAsk
                ? "border-primary-200 bg-primary-50/60"
                : "border-warn-100 bg-warn-50"
            }
          >
            <div className="flex items-start gap-3">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-pill ${
                  showAsk ? "bg-primary-600 text-white" : "bg-warn-500 text-white"
                }`}
              >
                {showAsk ? <BellIcon width={19} height={19} /> : <ShieldIcon width={19} height={19} />}
              </span>

              <div className="min-w-0 flex-1">
                {showAsk && (
                  <>
                    <p className="text-sm font-extrabold text-ink">یادآورها را روشن کنیم؟</p>
                    <p className="mt-1 text-2xs leading-5 text-ink-muted">
                      وعده‌های غذایی، مکمل‌ها و داروها، تمرین امروز و پیام مشاور — سر وقت به شما
                      اطلاع می‌دهیم.
                    </p>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void request()}
                        className="app-btn-primary flex-1 py-2 text-xs"
                      >
                        فعال‌سازی اعلان‌ها
                      </button>
                      <button
                        type="button"
                        onClick={dismissPrompt}
                        className="app-btn-ghost shrink-0 px-3 py-2 text-xs"
                      >
                        بعداً
                      </button>
                    </div>
                  </>
                )}

                {showDenied && (
                  <>
                    <p className="text-sm font-extrabold text-warn-600">اعلان‌ها مسدود شده است</p>
                    <p className="mt-1 text-2xs leading-5 text-warn-600">
                      مرورگر اجازه‌ی نمایش اعلان را نمی‌دهد. برای فعال‌سازی، از تنظیمات مرورگر
                      بخش «اعلان‌ها» را برای هلوفیت روی «مجاز» بگذارید.
                    </p>
                    <p className="mt-1.5 text-2xs leading-5 text-ink-muted">
                      تا آن زمان همه‌ی یادآورها در <span className="font-bold">صندوق اعلان‌های
                      داخل برنامه</span> (آیکن زنگوله در بالای صفحه) ثبت می‌شود و چیزی از دست
                      نمی‌رود.
                    </p>
                  </>
                )}

                {showIos && (
                  <>
                    <p className="text-sm font-extrabold text-warn-600">
                      برای دریافت اعلان، برنامه را نصب کنید
                    </p>
                    <p className="mt-1 text-2xs leading-5 text-warn-600">
                      در iOS فقط نسخه‌ی نصب‌شده اجازه‌ی اعلان دارد. از منوی اشتراک‌گذاری سافاری
                      گزینه‌ی «افزودن به صفحه اصلی» را بزنید.
                    </p>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={dismissPrompt}
                aria-label="بستن"
                className="tap-target -m-1.5 grid shrink-0 place-items-center rounded-pill p-1.5 text-ink-soft"
              >
                <CloseIcon width={16} height={16} />
              </button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
