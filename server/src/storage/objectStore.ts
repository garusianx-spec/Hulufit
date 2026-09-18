import { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Config } from "../config/index.js";
import { logger } from "../lib/logger.js";

export interface PutInput {
  key: string;
  body: Buffer | Readable;
  contentType: string;
  contentLength?: number;
  /** Browser-facing filename for a download. */
  filename?: string;
  cacheControl?: string;
}

export interface ObjectStore {
  put(input: PutInput): Promise<void>;
  /** Time-limited GET url. Attachments are never public. */
  presignGet(key: string, opts?: { filename?: string; ttlSeconds?: number }): Promise<string>;
  /** CDN url when the object is public (avatars), else a presigned one. */
  publicOrSignedUrl(key: string, opts?: { filename?: string }): Promise<string>;
  remove(key: string): Promise<void>;
  healthy(): Promise<boolean>;
}

export class S3ObjectStore implements ObjectStore {
  private client: S3Client;

  constructor(private config: Config) {
    this.client = new S3Client({
      region: config.S3_REGION,
      ...(config.S3_ENDPOINT ? { endpoint: config.S3_ENDPOINT } : {}),
      forcePathStyle: config.S3_FORCE_PATH_STYLE,
      credentials:
        config.S3_ACCESS_KEY && config.S3_SECRET_KEY
          ? { accessKeyId: config.S3_ACCESS_KEY, secretAccessKey: config.S3_SECRET_KEY }
          : undefined,
    });
  }

  async put({ key, body, contentType, contentLength, filename, cacheControl }: PutInput) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentLength: contentLength,
        CacheControl: cacheControl ?? "private, max-age=31536000, immutable",
        ...(filename
          ? { ContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}` }
          : {}),
      }),
    );
  }

  async presignGet(key: string, opts: { filename?: string; ttlSeconds?: number } = {}) {
    const command = new GetObjectCommand({
      Bucket: this.config.S3_BUCKET,
      Key: key,
      ...(opts.filename
        ? {
            ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(opts.filename)}`,
          }
        : {}),
    });
    return getSignedUrl(this.client, command, {
      expiresIn: opts.ttlSeconds ?? this.config.PRESIGN_TTL_SECONDS,
    });
  }

  async publicOrSignedUrl(key: string, opts: { filename?: string } = {}) {
    // Avatars live behind the CDN; medical attachments never do.
    if (this.config.CDN_BASE_URL && key.startsWith("avatars/")) {
      return `${this.config.CDN_BASE_URL.replace(/\/$/, "")}/${key}`;
    }
    return this.presignGet(key, opts);
  }

  async remove(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.S3_BUCKET, Key: key }));
  }

  async healthy() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.config.S3_BUCKET }));
      return true;
    } catch (error) {
      logger.warn({ err: error }, "object store health check failed");
      return false;
    }
  }
}

/**
 * Filesystem-free stand-in used by the test suite and by `dev` runs without a
 * MinIO container. Implements the same contract so no calling code branches.
 */
export class InMemoryObjectStore implements ObjectStore {
  readonly objects = new Map<string, { body: Buffer; contentType: string }>();

  async put({ key, body, contentType }: PutInput) {
    const buffer = Buffer.isBuffer(body) ? body : await streamToBuffer(body);
    this.objects.set(key, { body: buffer, contentType });
  }

  async presignGet(key: string, opts: { filename?: string; ttlSeconds?: number } = {}) {
    const ttl = opts.ttlSeconds ?? 300;
    const expires = Math.floor(Date.now() / 1000) + ttl;
    return `memory://${key}?X-Amz-Expires=${ttl}&expires=${expires}`;
  }

  async publicOrSignedUrl(key: string, opts: { filename?: string } = {}) {
    return this.presignGet(key, opts);
  }

  async remove(key: string) {
    this.objects.delete(key);
  }

  async healthy() {
    return true;
  }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export function createObjectStore(config: Config): ObjectStore {
  const configured = Boolean(config.S3_ACCESS_KEY && config.S3_SECRET_KEY);
  if (!configured) {
    logger.warn("S3 credentials absent — using the in-memory object store (development only).");
    return new InMemoryObjectStore();
  }
  return new S3ObjectStore(config);
}
