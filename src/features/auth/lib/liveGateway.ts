import { env } from "@/lib/env";
import { AuthError, type AuthGateway, type OtpRequestResult } from "./gateway";
import { CSRF_HEADER, type Session } from "./session";

/**
 * Talks to the HelloFit gateway.
 *
 * Every call sends credentials so the httpOnly refresh cookie rides along, and
 * every state-changing call echoes the double-submit CSRF token. Errors come
 * back in one shape, so the screens never parse a response body themselves.
 */

const base = () => env.apiBaseUrl.replace(/\/$/, "");

interface ErrorBody {
  error?: { code?: string; message?: string; details?: { attemptsLeft?: number } };
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base()}/api/v1${path}`, {
      ...init,
      credentials: "include",
      headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    });
  } catch {
    throw new AuthError("offline", "ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.");
  }

  if (response.status === 204) return undefined as T;

  const body = (await response.json().catch(() => ({}))) as ErrorBody & T;
  if (response.ok) return body;

  const retryHeader = Number(response.headers.get("retry-after"));
  throw new AuthError(
    body.error?.code ?? "request_failed",
    body.error?.message ?? "درخواست ناموفق بود. دوباره تلاش کنید.",
    Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : undefined,
    body.error?.details?.attemptsLeft,
  );
}

export const liveGateway: AuthGateway = {
  requestCode(phone) {
    return call<OtpRequestResult>("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  },

  verifyCode(phone, code, device) {
    return call<Session>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code, deviceId: device }),
    });
  },

  async refresh(csrfToken) {
    try {
      return await call<Session>("/auth/refresh", {
        method: "POST",
        headers: { [CSRF_HEADER]: csrfToken },
      });
    } catch (error) {
      // No cookie, or an expired one, is the normal signed-out case.
      if (error instanceof AuthError && ["unauthorized", "forbidden"].includes(error.code)) {
        return null;
      }
      throw error;
    }
  },

  async signOut(csrfToken) {
    await call<void>("/auth/logout", { method: "POST", headers: { [CSRF_HEADER]: csrfToken } });
  },
};
