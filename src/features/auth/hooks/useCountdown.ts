"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Seconds remaining, driven by a wall-clock deadline rather than by counting
 * ticks — a backgrounded PWA stops firing timers, and a tab that slept for a
 * minute must come back showing the right number, not a minute behind.
 */
export function useCountdown(): {
  remaining: number;
  start: (seconds: number) => void;
  stop: () => void;
} {
  const deadline = useRef(0);
  const [remaining, setRemaining] = useState(0);

  const start = useCallback((seconds: number) => {
    deadline.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
  }, []);

  const stop = useCallback(() => {
    deadline.current = 0;
    setRemaining(0);
  }, []);

  useEffect(() => {
    if (remaining <= 0) return;

    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setRemaining(left);
    };

    const id = window.setInterval(tick, 500);
    // Re-sync the moment the tab comes back, before the next interval fires.
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [remaining]);

  return { remaining, start, stop };
}
