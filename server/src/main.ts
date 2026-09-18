import { createServer } from "node:http";
import { loadConfig } from "./config/index.js";
import { InMemoryRepository } from "./db/repository.js";
import { createApp } from "./http/app.js";
import { MemoryStaging } from "./http/staging.js";
import { logger } from "./lib/logger.js";
import { createGateway } from "./realtime/gateway.js";
import { PresenceTracker } from "./realtime/presence.js";
import { createObjectStore } from "./storage/objectStore.js";
import { seed } from "./db/seed.js";

const config = loadConfig();

const repo = new InMemoryRepository();
const store = createObjectStore(config);
const staging = new MemoryStaging();
const presence = new PresenceTracker();

await seed(repo);

const app = createApp({ config, repo, store, staging, presence });
const httpServer = createServer(app);
createGateway(httpServer, { config, repo, store, staging, presence });

httpServer.listen(config.PORT, () => {
  logger.info(
    { port: config.PORT, env: config.NODE_ENV, bucket: config.S3_BUCKET },
    "HelloFit gateway listening",
  );
});

/** Drain in-flight work before the orchestrator sends SIGKILL. */
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    logger.info({ signal }, "shutting down");
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
