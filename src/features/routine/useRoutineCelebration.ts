"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Fires once, on the day the routine is finished.
 *
 * Which day it last fired on is a per-device flourish, not domain state, so it
 * lives in `localStorage` rather than in the app store — a second device has no
 * business suppressing the moment. Every access is guarded: private mode can
 * throw on read, and a blocked store must not take the celebration with it.
 */
const KEY = "hellofit.celebrated-day";

function readDay(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function writeDay(day: string): void {
  try {
    window.localStorage.setItem(KEY, day);
  } catch {
    /* nothing to remember — at worst it celebrates twice */
  }
}

export function useRoutineCelebration(complete: boolean, day: string): {
  celebrating: boolean;
  dismiss: () => void;
} {
  const [celebrating, setCelebrating] = useState(false);
  // Guards against the effect re-firing while the burst is still on screen.
  const handled = useRef(false);

  useEffect(() => {
    if (!complete || handled.current) return;
    if (readDay() === day) {
      handled.current = true;
      return;
    }
    handled.current = true;
    writeDay(day);
    setCelebrating(true);
  }, [complete, day]);

  // A new day re-arms it.
  useEffect(() => {
    handled.current = false;
  }, [day]);

  const dismiss = useCallback(() => setCelebrating(false), []);

  useEffect(() => {
    if (!celebrating) return;
    const id = window.setTimeout(dismiss, 3200);
    return () => window.clearTimeout(id);
  }, [celebrating, dismiss]);

  return { celebrating, dismiss };
}
