import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { loadConfig, type Config } from "../src/config/index.js";
import { InMemoryRepository } from "../src/db/repository.js";
import { AuthService } from "../src/features/auth/otp.service.js";
import type { SmsProvider } from "../src/features/auth/sms.provider.js";
import { createApp } from "../src/http/app.js";
import { MemoryStaging } from "../src/http/staging.js";
import { createGateway } from "../src/realtime/gateway.js";
import { PresenceTracker } from "../src/realtime/presence.js";
import { InMemoryObjectStore } from "../src/storage/objectStore.js";

/** Captures what would have been texted, so a test can read the code back. */
export class CapturingSmsProvider implements SmsProvider {
  readonly name = "capture";
  readonly sent: Array<{ to: string; text: string }> = [];

  async send(to: string, text: string): Promise<void> {
    this.sent.push({ to, text });
  }

  lastCodeFor(to: string): string {
    const entry = [...this.sent].reverse().find((s) => s.to === to);
    const code = entry?.text.match(/(\d{5})/)?.[1];
    if (!code) throw new Error(`no code captured for ${to}`);
    return code;
  }
}

export interface Harness {
  config: Config;
  sms: CapturingSmsProvider;
  repo: InMemoryRepository;
  store: InMemoryObjectStore;
  staging: MemoryStaging;
  presence: PresenceTracker;
  server: Server;
  baseUrl: string;
  close(): Promise<void>;
}

export async function startHarness(): Promise<Harness> {
  const config = loadConfig({
    NODE_ENV: "test",
    JWT_SECRET: "test-secret-that-is-long-enough-01234",
    CORS_ORIGINS: "http://localhost:3000",
    MAX_UPLOAD_BYTES: String(30 * 1024 * 1024),
    OTP_PEPPER: "test-pepper-0123456789",
    OTP_TTL_SECONDS: "120",
    OTP_RESEND_COOLDOWN_SECONDS: "120",
    OTP_MAX_ATTEMPTS: "5",
  } as NodeJS.ProcessEnv);

  const repo = new InMemoryRepository();
  const store = new InMemoryObjectStore();
  const staging = new MemoryStaging();
  const presence = new PresenceTracker();

  const now = new Date().toISOString();
  await repo.upsertUser({ id: "sp_1", phone: "+989121112233", role: "specialist", name: "دکتر کیانی", avatarKey: null, createdAt: now });
  await repo.upsertUser({ id: "u_1", phone: "+989123456789", role: "client", name: "سارا", avatarKey: null, createdAt: now });
  await repo.upsertUser({ id: "u_9", phone: "+989129999999", role: "client", name: "غریبه", avatarKey: null, createdAt: now });
  await repo.upsertUser({ id: "admin_1", phone: "+989120000000", role: "admin", name: "مدیر", avatarKey: null, createdAt: now });
  repo.addThread({ id: "th_1", clientId: "u_1", specialistId: "sp_1", createdAt: now });

  const sms = new CapturingSmsProvider();
  const auth = new AuthService(config, repo, sms);
  const app = createApp({ config, repo, store, staging, presence, auth });
  const server = createServer(app);
  createGateway(server, { config, repo, store, staging, presence });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    config,
    sms,
    repo,
    store,
    staging,
    presence,
    server,
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

export async function devToken(
  baseUrl: string,
  body: { userId: string; role: string; name?: string; threads?: string[] },
) {
  const res = await fetch(`${baseUrl}/api/v1/auth/dev-token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`dev-token failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { accessToken: string };
  return json.accessToken;
}

/** Builds a multipart body around a buffer, without pulling in a dependency. */
export function multipart(opts: { filename: string; mime: string; body: Buffer }) {
  const boundary = `----hellofit${Math.random().toString(16).slice(2)}`;
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${opts.filename}"\r\n` +
      `Content-Type: ${opts.mime}\r\n\r\n`,
    "utf8",
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat([head, opts.body, tail]),
  };
}

/** A real 1×1 PNG, so magic-number sniffing passes. */
export const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** A minimal but structurally valid PDF. */
export const PDF_TINY = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
  "latin1",
);
