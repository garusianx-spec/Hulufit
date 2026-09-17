"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NotificationChannel, NotificationPermissionState, ScheduledNotification } from "@/types";
import { useAppStore } from "@/lib/store/AppStore";
import { dietPlan } from "@/lib/mock/diet";
import { workoutPlan } from "@/lib/mock/workouts";
import {
  getPermissionState,
  getRegistration,
  isIosBrowserTab,
  isNotificationSupported,
  requestNotificationPermission,
} from "./permission";
import { buildTodaysSchedule, todaysWorkout } from "./scheduler";

/**
 * The single place notifications are driven from.
 *
 * Reminders are computed from the plan on every tick rather than queued, so a
 * ticked checkbox, an edited plan or a toggled channel takes effect at once.
 * Delivery is: OS notification via the service worker when permission is
 * granted, and always an entry in the in-app inbox — which is what the user
 * sees when they have denied permission.
 */

const TICK_MS = 30_000;
/** A reminder more than this far past its slot is stale; don't fire it late. */
const STALE_AFTER_MS = 30 * 60_000;

function dayStamp(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function useNotifications() {
  const store = useAppStore();
  const { notifications, mealDone, supplements, workoutDone, dispatch } = store;

  const [permission, setPermission] = useState<NotificationPermissionState>("default");
  const [supported, setSupported] = useState(true);
  const [iosTab, setIosTab] = useState(false);

  useEffect(() => {
    setSupported(isNotificationSupported());
    setPermission(getPermissionState());
    setIosTab(isIosBrowserTab());
  }, []);

  /* ------------------------------ delivery ------------------------------- */

  /**
   * Renders one notification. Goes through the service worker (the only path
   * that supports action buttons) and falls back to the page-level constructor.
   * Always records an inbox entry, whatever the permission state.
   */
  const notify = useCallback(
    async (payload: {
      channel: NotificationChannel;
      title: string;
      body: string;
      url: string;
      actions?: Array<{ action: string; title: string }>;
      key?: string;
      silent?: boolean;
    }) => {
      const granted = getPermissionState() === "granted";

      dispatch({
        type: "notif/push",
        notification: {
          channel: payload.channel,
          title: payload.title,
          body: payload.body,
          url: payload.url,
          inAppOnly: !granted,
        },
      });

      if (!granted) return false;

      const registration = await getRegistration();
      if (registration?.active) {
        registration.active.postMessage({
          type: "SHOW_NOTIFICATION",
          payload: { ...payload, at: Date.now(), renotify: true },
        });
        return true;
      }

      // No worker (dev server, or it hasn't claimed the page yet).
      try {
        new Notification(payload.title, {
          body: payload.body,
          icon: "/icons/icon-192.png",
          dir: "rtl",
          lang: "fa-IR",
          tag: payload.key,
        });
        return true;
      } catch {
        return false;
      }
    },
    [dispatch],
  );

  const request = useCallback(async () => {
    const next = await requestNotificationPermission();
    setPermission(next);
    if (next === "granted") {
      await notify({
        channel: "chat",
        title: "اعلان‌ها فعال شد ✅",
        body: "از این پس یادآور وعده‌ها، مکمل‌ها و پیام‌های مشاور را دریافت می‌کنید.",
        url: "/",
        silent: true,
      });
    }
    return next;
  }, [notify]);

  /* ------------------------ today's reminder set ------------------------- */

  const schedule = useMemo<ScheduledNotification[]>(
    () =>
      buildTodaysSchedule({
        meals: dietPlan.meals,
        mealDone,
        supplements,
        workout: todaysWorkout(workoutPlan.days),
        workoutDone: Boolean(todaysWorkout(workoutPlan.days) && workoutDone[todaysWorkout(workoutPlan.days)!.id]),
        channels: notifications.channels,
        leadMinutes: notifications.leadMinutes,
      }),
    [mealDone, supplements, workoutDone, notifications.channels, notifications.leadMinutes],
  );

  /* --------------------------- the ticking loop --------------------------- */

  // Keeps the interval callback from re-subscribing on every state change.
  const latest = useRef({ schedule, notifications, notify, dispatch });
  latest.current = { schedule, notifications, notify, dispatch };

  useEffect(() => {
    if (!supported) return;

    const tick = () => {
      const { schedule: due, notifications: state, notify: send, dispatch: send2 } = latest.current;
      const now = Date.now();
      const day = dayStamp();
      const alreadyFired = state.firedDay === day ? state.firedKeys : [];

      for (const item of due) {
        if (item.at > now) continue;
        if (now - item.at > STALE_AFTER_MS) continue;
        if (alreadyFired.includes(item.key)) continue;

        send2({ type: "notif/markFired", key: item.key, day });
        void send({
          channel: item.channel,
          title: item.title,
          body: item.body,
          url: item.url,
          actions: item.actions,
          key: item.key,
        });
      }
    };

    tick();
    const interval = setInterval(tick, TICK_MS);
    // A backgrounded tab throttles timers; catch up the moment it returns.
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [supported]);

  /* -------------------- action buttons coming back in --------------------- */

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "notification-action") {
        const key: string = data.data?.key ?? "";
        // Keys are "kind:id:day" — the middle segment addresses the record.
        const [kind, id] = key.split(":");

        if (data.action === "supplement-taken" && kind === "supp" && id) {
          dispatch({ type: "supplement/toggleTaken", id });
        }
        if (data.action === "meal-done" && kind === "meal" && id) {
          const meal = dietPlan.meals.find((m) => m.id === id);
          if (meal) {
            dispatch({
              type: "meal/toggleAll",
              mealId: meal.id,
              itemIds: meal.items.map((i) => i.id),
              calories: meal.items.reduce((sum, i) => sum + i.calories, 0),
            });
          }
        }
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [dispatch]);

  return {
    supported,
    iosTab,
    permission,
    request,
    notify,
    schedule,
    channels: notifications.channels,
    inbox: notifications.inbox,
    unread: notifications.inbox.filter((n) => !n.read).length,
    setChannel: (channel: NotificationChannel, on: boolean) =>
      dispatch({ type: "notif/setChannel", channel, on }),
    setLead: (minutes: number) => dispatch({ type: "notif/setLead", minutes }),
    dismissPrompt: () => dispatch({ type: "notif/dismissPrompt" }),
    markRead: (id: string) => dispatch({ type: "notif/markRead", id }),
    markAllRead: () => dispatch({ type: "notif/markAllRead" }),
    clear: () => dispatch({ type: "notif/clear" }),
    promptDismissed: notifications.promptDismissed,
  };
}
