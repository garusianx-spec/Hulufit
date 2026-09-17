import type { NotificationPermissionState } from "@/types";

/**
 * Capability and permission probing, kept away from React so it can be called
 * during render guards without pulling in hook rules.
 */

export function isNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}

/**
 * iOS only exposes the Notification API to installed (standalone) web apps.
 * On Safari in a tab the constructor exists but permission can never be
 * granted, so the UI has to ask the user to install first.
 */
export function isIosBrowserTab(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  if (!isIos) return false;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari's own flag, absent from the TS DOM types.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return !standalone;
}

export function getPermissionState(): NotificationPermissionState {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission as NotificationPermissionState;
}

/**
 * Requests permission. Must be called from a user gesture — browsers reject
 * (and Chrome permanently blocks) requests made on load.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return "unsupported";
  if (Notification.permission !== "default") {
    return Notification.permission as NotificationPermissionState;
  }
  try {
    const result = await Notification.requestPermission();
    return result as NotificationPermissionState;
  } catch {
    // Safari < 16 used the callback form and throws on the promise form.
    return getPermissionState();
  }
}

/** The active worker, or null when it hasn't taken control yet. */
export async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    return null;
  }
}
