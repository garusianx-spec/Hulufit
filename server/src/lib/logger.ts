import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
  // Never let a token or a patient's note reach the log sink.
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "*.token", "*.password"],
    censor: "[redacted]",
  },
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
      : undefined,
});
