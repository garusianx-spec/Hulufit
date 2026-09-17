"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AttachmentKind, UploadTask } from "@/types";
import { guardFile, MAX_ATTACHMENT_BYTES } from "./fileGuards";

/**
 * Chunked upload driver.
 *
 * In production `transport` is swapped for an XHR/fetch call that streams the
 * chunk to `POST /api/uploads/:id/chunk` and reports progress; the mock
 * transport below simulates realistic throughput so the UI (progress bar,
 * speed, cancel, retry) is exercised end to end without a server.
 */

export const CHUNK_BYTES = 512 * 1024; // 512 KB — keeps progress smooth on 3G

export type ChunkTransport = (args: {
  taskId: string;
  file: File;
  chunkIndex: number;
  chunkCount: number;
  signal: AbortSignal;
}) => Promise<void>;

const mockTransport: ChunkTransport = ({ signal }) =>
  new Promise((resolve, reject) => {
    // ~1.6 MB/s with jitter, i.e. a 30 MB file lands in ~19s.
    const delay = 300 + Math.random() * 120;
    const timer = setTimeout(() => {
      // 1-in-90 chunks fails so the retry path stays honest.
      if (Math.random() < 0.011) reject(new Error("network"));
      else resolve();
    }, delay);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("aborted", "AbortError"));
    });
  });

interface Options {
  maxBytes?: number;
  allow?: AttachmentKind[];
  transport?: ChunkTransport;
  onRejected?: (message: string) => void;
  onComplete?: (task: UploadTask) => void;
}

export function useFileUpload(options: Options = {}) {
  const {
    maxBytes = MAX_ATTACHMENT_BYTES,
    allow,
    transport = mockTransport,
    onRejected,
    onComplete,
  } = options;

  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const objectUrls = useRef(new Set<string>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controllers.current.forEach((c) => c.abort());
      controllers.current.clear();
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current.clear();
    };
  }, []);

  const patch = useCallback((id: string, next: Partial<UploadTask>) => {
    if (!mounted.current) return;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...next } : t)));
  }, []);

  const run = useCallback(
    async (task: UploadTask) => {
      const controller = new AbortController();
      controllers.current.set(task.id, controller);

      const chunkCount = Math.max(1, Math.ceil(task.file.size / CHUNK_BYTES));
      let bytesSent = 0;
      patch(task.id, { status: "uploading", startedAt: Date.now() });

      for (let index = 0; index < chunkCount; index += 1) {
        try {
          await transport({
            taskId: task.id,
            file: task.file,
            chunkIndex: index,
            chunkCount,
            signal: controller.signal,
          });
        } catch (error) {
          controllers.current.delete(task.id);
          if ((error as Error).name === "AbortError") {
            patch(task.id, { status: "canceled" });
          } else {
            patch(task.id, {
              status: "error",
              error: "ارسال ناموفق بود. دوباره تلاش کنید.",
            });
          }
          return;
        }

        bytesSent = Math.min(task.file.size, (index + 1) * CHUNK_BYTES);
        const elapsed = Math.max(1, Date.now() - task.startedAt) / 1000;
        patch(task.id, {
          bytesSent,
          progress: Math.round((bytesSent / task.file.size) * 100),
          speedBps: bytesSent / elapsed,
        });
      }

      controllers.current.delete(task.id);
      patch(task.id, { status: "done", progress: 100, bytesSent: task.file.size });
      onComplete?.({ ...task, status: "done", progress: 100, bytesSent: task.file.size });
    },
    [onComplete, patch, transport],
  );

  /** Validates, previews and starts uploading. Rejected files never allocate. */
  const enqueue = useCallback(
    (files: File[] | FileList) => {
      const list = Array.from(files);
      const started: UploadTask[] = [];

      for (const file of list) {
        const verdict = guardFile(file, { maxBytes, allow });
        if (!verdict.ok) {
          onRejected?.(verdict.message);
          continue;
        }

        const previewUrl = verdict.kind === "image" ? URL.createObjectURL(file) : undefined;
        if (previewUrl) objectUrls.current.add(previewUrl);

        started.push({
          id: `up_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          file,
          kind: verdict.kind,
          previewUrl,
          progress: 0,
          status: "validating",
          bytesSent: 0,
          startedAt: Date.now(),
          speedBps: 0,
        });
      }

      if (started.length === 0) return [];
      setTasks((prev) => [...prev, ...started]);
      started.forEach((task) => void run(task));
      return started;
    },
    [allow, maxBytes, onRejected, run],
  );

  const cancel = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
  }, []);

  const retry = useCallback(
    (id: string) => {
      setTasks((prev) => {
        const task = prev.find((t) => t.id === id);
        if (task) {
          const fresh = { ...task, progress: 0, bytesSent: 0, error: undefined, startedAt: Date.now() };
          void run(fresh);
          return prev.map((t) => (t.id === id ? fresh : t));
        }
        return prev;
      });
    },
    [run],
  );

  const remove = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (task?.previewUrl) {
        URL.revokeObjectURL(task.previewUrl);
        objectUrls.current.delete(task.previewUrl);
      }
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const clearFinished = useCallback(() => {
    setTasks((prev) => prev.filter((t) => t.status !== "done" && t.status !== "canceled"));
  }, []);

  return { tasks, enqueue, cancel, retry, remove, clearFinished };
}
