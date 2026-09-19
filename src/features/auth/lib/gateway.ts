import type { Session } from "./session";

/** Result of asking for a code. Seconds, so the countdown can use it directly. */
export interface OtpRequestResult {
  expiresIn: number;
  resendAfter: number;
  masked: string;
  /** Only ever present outside production, where no real SMS was sent. */
  devCode?: string;
}

/** A failure the UI can act on: a message to show and a code to branch on. */
export class AuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryAfter?: number,
    readonly attemptsLeft?: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export interface AuthGateway {
  requestCode(phone: string): Promise<OtpRequestResult>;
  verifyCode(phone: string, code: string, deviceId: string): Promise<Session>;
  /** Resumes a session from the refresh cookie. Null when there is none. */
  refresh(csrfToken: string): Promise<Session | null>;
  signOut(csrfToken: string): Promise<void>;
}

const DEVICE_KEY = "hellofit.device";

/** Stable per-browser id, so a refresh token is scoped to one device. */
export function deviceId(): string {
  try {
    const existing = window.localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, fresh);
    return fresh;
  } catch {
    // Private mode with storage blocked: a per-tab id still works.
    return "ephemeral-device";
  }
}
