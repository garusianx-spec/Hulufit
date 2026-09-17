"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useNotifications } from "./useNotifications";

type NotificationApi = ReturnType<typeof useNotifications>;

const NotificationContext = createContext<NotificationApi | null>(null);

/**
 * Mounts the notification driver exactly once.
 *
 * The driver owns a ticking loop and a service-worker message listener, so it
 * must not be instantiated per screen — every consumer reads this context.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const api = useNotifications();
  return <NotificationContext.Provider value={api}>{children}</NotificationContext.Provider>;
}

export function useNotificationCenter(): NotificationApi {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotificationCenter must be used inside <NotificationProvider>");
  return ctx;
}
