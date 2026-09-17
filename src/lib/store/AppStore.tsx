"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { DailyLog, SupplementItem, UserProfile, WeightEntry } from "@/types";
import { currentUser, todayLog, weightHistory } from "@/lib/mock/user";
import { supplements as seedSupplements } from "@/lib/mock/supplements";

/**
 * Single client-side store for the pre-authenticated demo state.
 * Persisted to localStorage so a TWA relaunch keeps the user's day intact.
 */

const STORAGE_KEY = "hellofit.state.v1";

interface State {
  user: UserProfile;
  today: DailyLog;
  weights: WeightEntry[];
  /** mealId → itemIds that were eaten (or swapped-and-eaten) */
  mealDone: Record<string, string[]>;
  /** foodItemId → replacement label chosen through Food Swap */
  swaps: Record<string, { name: string; calories: number }>;
  /** exerciseId → array of set completion flags */
  setDone: Record<string, boolean[]>;
  workoutDone: Record<string, boolean>;
  supplements: SupplementItem[];
  bookmarks: string[];
  hydrated: boolean;
}

type Action =
  | { type: "hydrate"; payload: Partial<State> }
  | { type: "water/add"; ml: number }
  | { type: "water/reset" }
  | { type: "weight/log"; weightKg: number }
  | { type: "calories/add"; kcal: number }
  | { type: "meal/toggleItem"; mealId: string; itemId: string; calories: number }
  | { type: "meal/toggleAll"; mealId: string; itemIds: string[]; calories: number }
  | { type: "meal/swap"; itemId: string; name: string; calories: number }
  | { type: "exercise/toggleSet"; exerciseId: string; index: number; total: number }
  | { type: "workout/toggleDay"; dayId: string }
  | { type: "supplement/toggleTaken"; id: string }
  | { type: "supplement/toggleReminder"; id: string }
  | { type: "article/toggleBookmark"; id: string }
  | { type: "avatar/set"; dataUrl: string | null };

const initialState: State = {
  user: currentUser,
  today: todayLog,
  weights: weightHistory,
  mealDone: { m_bf: ["f_1", "f_2", "f_3", "f_4"], m_ms: ["f_5", "f_6"] },
  swaps: {},
  setDone: {},
  workoutDone: {},
  supplements: seedSupplements.map((s, i) =>
    i < 2 ? { ...s, takenAt: new Date(new Date().setHours(8, 4, 0, 0)).toISOString() } : s,
  ),
  bookmarks: ["ar_1"],
  hydrated: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { ...state, ...action.payload, hydrated: true };

    case "water/add": {
      const waterMl = Math.max(0, state.today.waterMl + action.ml);
      return { ...state, today: { ...state.today, waterMl } };
    }

    case "water/reset":
      return { ...state, today: { ...state.today, waterMl: 0 } };

    case "weight/log": {
      const iso = new Date().toISOString();
      const withoutToday = state.weights.filter(
        (w) => new Date(w.date).toDateString() !== new Date().toDateString(),
      );
      return {
        ...state,
        weights: [...withoutToday, { date: iso, weightKg: action.weightKg }],
        user: { ...state.user, currentWeightKg: action.weightKg },
      };
    }

    case "calories/add":
      return {
        ...state,
        today: {
          ...state.today,
          caloriesConsumed: Math.max(0, state.today.caloriesConsumed + action.kcal),
        },
      };

    case "meal/toggleItem": {
      const current = state.mealDone[action.mealId] ?? [];
      const has = current.includes(action.itemId);
      const next = has ? current.filter((id) => id !== action.itemId) : [...current, action.itemId];
      return {
        ...state,
        mealDone: { ...state.mealDone, [action.mealId]: next },
        today: {
          ...state.today,
          caloriesConsumed: Math.max(
            0,
            state.today.caloriesConsumed + (has ? -action.calories : action.calories),
          ),
        },
      };
    }

    case "meal/toggleAll": {
      const current = state.mealDone[action.mealId] ?? [];
      const allDone = current.length === action.itemIds.length;
      return {
        ...state,
        mealDone: { ...state.mealDone, [action.mealId]: allDone ? [] : action.itemIds },
        today: {
          ...state.today,
          caloriesConsumed: Math.max(
            0,
            state.today.caloriesConsumed + (allDone ? -action.calories : action.calories),
          ),
        },
      };
    }

    case "meal/swap":
      return {
        ...state,
        swaps: { ...state.swaps, [action.itemId]: { name: action.name, calories: action.calories } },
      };

    case "exercise/toggleSet": {
      const current = state.setDone[action.exerciseId] ?? new Array(action.total).fill(false);
      const next = [...current];
      next[action.index] = !next[action.index];
      return { ...state, setDone: { ...state.setDone, [action.exerciseId]: next } };
    }

    case "workout/toggleDay":
      return {
        ...state,
        workoutDone: { ...state.workoutDone, [action.dayId]: !state.workoutDone[action.dayId] },
      };

    case "supplement/toggleTaken":
      return {
        ...state,
        supplements: state.supplements.map((s) =>
          s.id === action.id
            ? { ...s, takenAt: s.takenAt ? null : new Date().toISOString() }
            : s,
        ),
      };

    case "supplement/toggleReminder":
      return {
        ...state,
        supplements: state.supplements.map((s) =>
          s.id === action.id ? { ...s, reminderOn: !s.reminderOn } : s,
        ),
      };

    case "article/toggleBookmark":
      return {
        ...state,
        bookmarks: state.bookmarks.includes(action.id)
          ? state.bookmarks.filter((id) => id !== action.id)
          : [...state.bookmarks, action.id],
      };

    case "avatar/set":
      return { ...state, user: { ...state.user, avatarUrl: action.dataUrl } };

    default:
      return state;
  }
}

interface StoreValue extends State {
  dispatch: React.Dispatch<Action>;
  /** Percent of today's plan actually completed — drives the compliance ring. */
  compliance: { meals: number; workout: number; supplements: number; water: number; overall: number };
}

const AppStoreContext = createContext<StoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Restore on mount (client only — TWA cold starts land here).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<State>;
        dispatch({ type: "hydrate", payload: saved });
      } else {
        dispatch({ type: "hydrate", payload: {} });
      }
    } catch {
      dispatch({ type: "hydrate", payload: {} });
    }
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      const { hydrated: _hydrated, ...persistable } = state;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
    } catch {
      // Storage full or blocked (private mode) — the session still works in memory.
    }
  }, [state]);

  const compliance = useMemo(() => {
    const totalMealItems = Object.values(state.mealDone).reduce((n, list) => n + list.length, 0);
    const meals = Math.min(100, Math.round((totalMealItems / 15) * 100));
    const totalSets = Object.values(state.setDone).flat();
    const workout = totalSets.length
      ? Math.round((totalSets.filter(Boolean).length / totalSets.length) * 100)
      : 0;
    const taken = state.supplements.filter((s) => s.takenAt).length;
    const supplementsPct = state.supplements.length
      ? Math.round((taken / state.supplements.length) * 100)
      : 0;
    const water = Math.min(
      100,
      Math.round((state.today.waterMl / state.user.dailyWaterTargetMl) * 100),
    );
    const overall = Math.round(meals * 0.4 + workout * 0.25 + supplementsPct * 0.15 + water * 0.2);
    return { meals, workout, supplements: supplementsPct, water, overall };
  }, [state.mealDone, state.setDone, state.supplements, state.today.waterMl, state.user.dailyWaterTargetMl]);

  const value = useMemo<StoreValue>(() => ({ ...state, dispatch, compliance }), [state, compliance]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): StoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used inside <AppStoreProvider>");
  return ctx;
}

/** Convenience selector for the bits most screens need. */
export function useUser() {
  const { user } = useAppStore();
  return user;
}

export function useToggleBookmark() {
  const { dispatch } = useAppStore();
  return useCallback((id: string) => dispatch({ type: "article/toggleBookmark", id }), [dispatch]);
}
