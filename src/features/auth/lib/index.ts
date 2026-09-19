import { env } from "@/lib/env";
import type { AuthGateway } from "./gateway";
import { liveGateway } from "./liveGateway";
import { mockGateway } from "./mockGateway";

/** One place decides which backend sign-in talks to. */
export const authGateway: AuthGateway = env.authMode === "live" ? liveGateway : mockGateway;

export { AuthError, deviceId, type OtpRequestResult } from "./gateway";
export * from "./phone";
export * from "./session";
