"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authGateway, deviceId, type OtpRequestResult } from "../lib";
import { CSRF_HEADER, clearHint, writeHint, type Principal, type Session } from "../lib/session";

/**
 * Session state for the whole app.
 *
 * The access token is held in memory only — never in localStorage, where any
 * injected script could read it. Surviving a reload is the refresh cookie's
 * job, so a cold boot always starts with one call to the gateway.
 */

type Status = "loading" | "anonymous" | "authenticated";

interface AuthValue {
  status: Status;
  principal: Principal | null;
  /** Bearer token for API calls. Null while signed out. */
  accessToken: string | null;
  /** Value for the `x-csrf-token` header on state-changing calls. */
  csrfToken: string | null;
  requestCode(phone: string): Promise<OtpRequestResult>;
  verifyCode(phone: string, code: string): Promise<Principal>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Mirrors the cookie the gateway set, so a cold boot can pass CSRF. */
function readCsrfCookie(): string {
  const match = document.cookie.match(/(?:^|; )hf_csrf=([^;]*)/);
  return match?.[1] ?? "";
}

/** Keeps the hint cookie alive for roughly the refresh token's lifetime. */
const HINT_MAX_AGE = 30 * 24 * 60 * 60;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const bootstrapped = useRef(false);

  const adopt = useCallback((next: Session) => {
    setSession(next);
    setStatus("authenticated");
    writeHint(next.principal.role, HINT_MAX_AGE);
  }, []);

  useEffect(() => {
    // Strict Mode mounts twice in development; one bootstrap is enough.
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    let cancelled = false;
    void (async () => {
      try {
        const resumed = await authGateway.refresh(readCsrfCookie());
        if (cancelled) return;
        if (resumed) adopt(resumed);
        else {
          clearHint();
          setStatus("anonymous");
        }
      } catch {
        // A gateway that is down must not lock the shell into "loading".
        if (!cancelled) setStatus("anonymous");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adopt]);

  const requestCode = useCallback((phone: string) => authGateway.requestCode(phone), []);

  const verifyCode = useCallback(
    async (phone: string, code: string) => {
      const next = await authGateway.verifyCode(phone, code, deviceId());
      adopt(next);
      return next.principal;
    },
    [adopt],
  );

  const signOut = useCallback(async () => {
    try {
      await authGateway.signOut(session?.csrfToken ?? readCsrfCookie());
    } finally {
      clearHint();
      setSession(null);
      setStatus("anonymous");
    }
  }, [session]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      principal: session?.principal ?? null,
      accessToken: session?.accessToken ?? null,
      csrfToken: session?.csrfToken ?? null,
      requestCode,
      verifyCode,
      signOut,
    }),
    [status, session, requestCode, verifyCode, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>.");
  return value;
}

/** Headers for an authenticated, state-changing API call. */
export function authHeaders(auth: AuthValue): Record<string, string> {
  return {
    ...(auth.accessToken ? { authorization: `Bearer ${auth.accessToken}` } : {}),
    ...(auth.csrfToken ? { [CSRF_HEADER]: auth.csrfToken } : {}),
  };
}
