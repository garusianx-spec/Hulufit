import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import type { Config } from "../config/index.js";
import { AuthService } from "../features/auth/otp.service.js";
import { otpAuthRouter } from "../features/auth/otp.routes.js";
import type { Repository } from "../db/repository.js";
import { logger } from "../lib/logger.js";
import { ApiError, toErrorBody } from "../lib/errors.js";
import type { PresenceTracker } from "../realtime/presence.js";
import type { ObjectStore } from "../storage/objectStore.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { mediaRouter } from "./routes/media.js";
import { messagesRouter } from "./routes/messages.js";
import type { MemoryStaging } from "./staging.js";

export interface AppDeps {
  config: Config;
  repo: Repository;
  store: ObjectStore;
  staging: MemoryStaging;
  presence: PresenceTracker;
  /** Injectable so a test can drive sign-in with a capturing SMS provider. */
  auth?: AuthService;
}

export function createApp(deps: AppDeps) {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    helmet({
      // The API serves JSON and presigned redirects only; CSP belongs to the
      // Next app that renders HTML.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin and server-to-server calls arrive without an Origin.
        if (!origin || deps.config.corsOrigins.includes(origin)) return callback(null, true);
        callback(new Error("origin not allowed"));
      },
      credentials: true,
    }),
  );
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/healthz" } }));

  // JSON only for non-upload routes; multipart is streamed by busboy instead,
  // so no body parser ever buffers a 30 MB file into memory.
  app.use(express.json({ limit: "256kb" }));
  app.use(cookieParser());

  app.get("/healthz", async (_req, res) => {
    const storeOk = await deps.store.healthy();
    res.status(storeOk ? 200 : 503).json({
      status: storeOk ? "ok" : "degraded",
      uptimeSeconds: Math.round(process.uptime()),
      online: deps.presence.onlineCount(),
      objectStore: storeOk ? "ok" : "unreachable",
    });
  });

  const auth = deps.auth ?? new AuthService(deps.config, deps.repo);
  app.use("/api/v1", otpAuthRouter({ config: deps.config, repo: deps.repo, auth }));
  app.use("/api/v1", authRouter({ config: deps.config, repo: deps.repo }));
  app.use("/api/v1", messagesRouter({ config: deps.config, repo: deps.repo, store: deps.store }));
  app.use("/api/v1", mediaRouter(deps));
  app.use(
    "/api/v1",
    adminRouter({ config: deps.config, presence: deps.presence, staging: deps.staging }),
  );

  app.use((_req, _res, next) => next(ApiError.notFound("مسیر مورد نظر یافت نشد.")));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    const { status, body } = toErrorBody(error);
    if (status >= 500) logger.error({ err: error, url: req.url }, "unhandled error");
    // A throttled caller is told when to come back, not left to guess.
    const retryAfter = (body.error.details as { retryAfter?: number } | undefined)?.retryAfter;
    if (status === 429 && typeof retryAfter === "number") res.setHeader("Retry-After", retryAfter);
    res.status(status).json(body);
  });

  return app;
}
