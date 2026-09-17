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
import type {
  AppNotification,
  AppRole,
  Assessment,
  DailyLog,
  DietDraft,
  NotificationChannel,
  SupplementDraft,
  SupplementItem,
  UserProfile,
  WeightEntry,
  HealthTargets,
  WorkoutDraft,
} from "@/types";
import { currentAssessment, currentUser, todayLog, weightHistory } from "@/lib/mock/user";
import { supplements as seedSupplements } from "@/lib/mock/supplements";
import { computeTargets } from "@/lib/health/calc";

/**
 * Single client-side store for the pre-authenticated demo state.
 * Persisted to localStorage so a TWA relaunch keeps the user's day intact.
 */

const STORAGE_KEY = "hellofit.state.v2";

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

  /** Which side of the product is on screen. */
  role: AppRole;

  /** Onboarding health assessment; `completedAt: null` routes to the wizard. */
  assessment: Assessment;

  notifications: {
    channels: Record<NotificationChannel, boolean>;
    /** In-app inbox — also the fallback when permission is denied. */
    inbox: AppNotification[];
    /** Reminder keys already fired, reset when the calendar day rolls over. */
    firedKeys: string[];
    firedDay: string;
    /** The soft-ask was dismissed; don't re-prompt on this device. */
    promptDismissed: boolean;
    /** Fire this many minutes before the scheduled time. */
    leadMinutes: number;
  };

  /** Specialist-side plan drafts, keyed by patient id. */
  doctor: {
    diet: Record<string, DietDraft>;
    workout: Record<string, WorkoutDraft>;
    supplements: Record<string, SupplementDraft>;
  };
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
  | { type: "avatar/set"; dataUrl: string | null }
  | { type: "role/set"; role: AppRole }
  | { type: "assessment/save"; assessment: Assessment }
  | { type: "assessment/reset" }
  | { type: "notif/setChannel"; channel: NotificationChannel; on: boolean }
  | { type: "notif/setLead"; minutes: number }
  | { type: "notif/dismissPrompt" }
  | { type: "notif/push"; notification: Omit<AppNotification, "id" | "at" | "read"> }
  | { type: "notif/markRead"; id: string }
  | { type: "notif/markAllRead" }
  | { type: "notif/clear" }
  | { type: "notif/markFired"; key: string; day: string }
  | { type: "doctor/saveDiet"; draft: DietDraft }
  | { type: "doctor/saveWorkout"; draft: WorkoutDraft }
  | { type: "doctor/saveSupplements"; draft: SupplementDraft }
  | { type: "doctor/publishSupplements"; draft: SupplementDraft };

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

  role: "client",

  // Seeded as already completed, so the demo still lands on the dashboard.
  // "شبیه‌سازی کاربر جدید" in Profile clears it and routes to the wizard.
  assessment: currentAssessment,

  notifications: {
    channels: { meals: true, supplements: true, workout: true, chat: true },
    inbox: [],
    firedKeys: [],
    firedDay: "",
    promptDismissed: false,
    leadMinutes: 0,
  },

  doctor: { diet: {}, workout: {}, supplements: {} },
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate": {
      const saved = action.payload;
      // Merge nested slices field-by-field so a blob written by an older build
      // can't drop a key that newer code reads.
      return {
        ...state,
        ...saved,
        user: { ...state.user, ...saved.user },
        assessment: { ...state.assessment, ...saved.assessment },
        notifications: {
          ...state.notifications,
          ...saved.notifications,
          channels: { ...state.notifications.channels, ...saved.notifications?.channels },
          inbox: saved.notifications?.inbox ?? state.notifications.inbox,
        },
        doctor: {
          diet: { ...state.doctor.diet, ...saved.doctor?.diet },
          workout: { ...state.doctor.workout, ...saved.doctor?.workout },
          supplements: { ...state.doctor.supplements, ...saved.doctor?.supplements },
        },
        hydrated: true,
      };
    }

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

    /* ---------------------------------- role -------------------------------- */

    case "role/set":
      return { ...state, role: action.role };

    /* ------------------------------ assessment ------------------------------ */

    case "assessment/save": {
      // Saving the wizard rewrites the targets the whole client side reads.
      const targets = computeTargets(action.assessment);
      return {
        ...state,
        assessment: action.assessment,
        user: {
          ...state.user,
          gender: action.assessment.gender,
          birthYear: action.assessment.birthYear,
          heightCm: action.assessment.heightCm,
          currentWeightKg: action.assessment.weightKg,
          targetWeightKg: action.assessment.targetWeightKg,
          dailyCalorieTarget: targets.dailyCalories,
          dailyWaterTargetMl: targets.waterTargetMl,
          macroTarget: targets.macros,
        },
      };
    }

    case "assessment/reset":
      return { ...state, assessment: { ...state.assessment, completedAt: null } };

    /* ----------------------------- notifications ---------------------------- */

    case "notif/setChannel":
      return {
        ...state,
        notifications: {
          ...state.notifications,
          channels: { ...state.notifications.channels, [action.channel]: action.on },
        },
      };

    case "notif/setLead":
      return {
        ...state,
        notifications: { ...state.notifications, leadMinutes: action.minutes },
      };

    case "notif/dismissPrompt":
      return { ...state, notifications: { ...state.notifications, promptDismissed: true } };

    case "notif/push": {
      const entry: AppNotification = {
        ...action.notification,
        id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        at: new Date().toISOString(),
        read: false,
      };
      return {
        ...state,
        notifications: {
          ...state.notifications,
          // Newest first, capped so the log can't grow without bound.
          inbox: [entry, ...state.notifications.inbox].slice(0, 50),
        },
      };
    }

    case "notif/markRead":
      return {
        ...state,
        notifications: {
          ...state.notifications,
          inbox: state.notifications.inbox.map((n) =>
            n.id === action.id ? { ...n, read: true } : n,
          ),
        },
      };

    case "notif/markAllRead":
      return {
        ...state,
        notifications: {
          ...state.notifications,
          inbox: state.notifications.inbox.map((n) => ({ ...n, read: true })),
        },
      };

    case "notif/clear":
      return { ...state, notifications: { ...state.notifications, inbox: [] } };

    case "notif/markFired": {
      // A new calendar day starts the fired-set over.
      const sameDay = state.notifications.firedDay === action.day;
      return {
        ...state,
        notifications: {
          ...state.notifications,
          firedDay: action.day,
          firedKeys: sameDay ? [...state.notifications.firedKeys, action.key] : [action.key],
        },
      };
    }

    /* -------------------------- specialist drafts --------------------------- */

    case "doctor/saveDiet":
      return {
        ...state,
        doctor: {
          ...state.doctor,
          diet: { ...state.doctor.diet, [action.draft.patientId]: action.draft },
        },
      };

    case "doctor/saveWorkout":
      return {
        ...state,
        doctor: {
          ...state.doctor,
          workout: { ...state.doctor.workout, [action.draft.patientId]: action.draft },
        },
      };

    case "doctor/saveSupplements":
      return {
        ...state,
        doctor: {
          ...state.doctor,
          supplements: { ...state.doctor.supplements, [action.draft.patientId]: action.draft },
        },
      };

    case "doctor/publishSupplements": {
      // The bridge the brief asks for: a specialist's schedule lands directly
      // in the client's own supplement timeline, reminders and all.
      const published: SupplementItem[] = action.draft.items.map((item) => ({
        id: item.id,
        name: item.name,
        latinName: item.latinName || undefined,
        kind: item.kind,
        dosage: item.dosage,
        window: item.window,
        timeLabel: item.timeLabel,
        withFood: item.withFood,
        note: item.note || undefined,
        reminderOn: item.reminderOn,
        takenAt: null,
      }));
      return {
        ...state,
        supplements: published,
        doctor: {
          ...state.doctor,
          supplements: { ...state.doctor.supplements, [action.draft.patientId]: action.draft },
        },
      };
    }

    default:
      return state;
  }
}

interface StoreValue extends State {
  dispatch: React.Dispatch<Action>;
  /** Percent of today's plan actually completed — drives the compliance ring. */
  compliance: { meals: number; workout: number; supplements: number; water: number; overall: number };
  /** Energy and macro targets derived from the current assessment. */
  targets: HealthTargets;
  unreadNotifications: number;
  /** True while the assessment is unfinished — the onboarding guard reads this. */
  needsOnboarding: boolean;
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

  const targets = useMemo(() => computeTargets(state.assessment), [state.assessment]);
  const unreadNotifications = useMemo(
    () => state.notifications.inbox.filter((n) => !n.read).length,
    [state.notifications.inbox],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      dispatch,
      compliance,
      targets,
      unreadNotifications,
      needsOnboarding: state.assessment.completedAt === null,
    }),
    [state, compliance, targets, unreadNotifications],
  );

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
