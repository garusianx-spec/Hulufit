/**
 * A drop-in stand-in for the real consultation socket.
 *
 * It mirrors the wire protocol exactly, so swapping in a real `WebSocket`
 * means replacing `createMockSocket()` with `new WebSocket(url)` and keeping
 * every `send()` / `onmessage` shape below untouched.
 *
 *   client → server : message.send · typing.start · typing.stop · read.ack · history.fetch
 *   server → client : message.new · message.ack · typing · read · presence · history.page
 */

import type { ChatMessage } from "@/types";

export type ClientEvent =
  | { t: "message.send"; clientId: string; text?: string; attachmentId?: string }
  | { t: "typing.start" }
  | { t: "typing.stop" }
  | { t: "read.ack"; upTo: string }
  | { t: "history.fetch"; before: string; limit: number };

export type ServerEvent =
  | { t: "message.new"; message: ChatMessage }
  | { t: "message.ack"; clientId: string; id: string; status: "sent" | "delivered" | "read" }
  | { t: "typing"; who: "coach"; active: boolean }
  | { t: "read"; upTo: string }
  | { t: "presence"; online: boolean; lastSeenLabel: string }
  | { t: "history.page"; messages: ChatMessage[]; hasMore: boolean };

export type SocketState = "connecting" | "open" | "reconnecting" | "closed";

export interface ChatSocket {
  send(event: ClientEvent): void;
  close(): void;
  readonly state: SocketState;
  onmessage?: (event: ServerEvent) => void;
  onstate?: (state: SocketState) => void;
}

const COACH_REPLIES = [
  "ممنون که فرستادی، دارم نگاه می‌کنم 🌿",
  "آزمایش رو دیدم. ویتامین D پایینه، مکملش رو به برنامه اضافه می‌کنم.",
  "عالیه! همین روند رو ادامه بده. این هفته وزنت خوب پیش رفته.",
  "اگر شام دیر می‌خوری، وعده میان‌وعده‌ی عصر رو سبک‌تر کن.",
  "برای فردا صبح یادت نره آب کافی بخوری 💧",
  "تمرین پا رو با وزنه‌ی کمتر ولی تکرار بیشتر انجام بده تا زانو اذیت نشه.",
];

let seq = 0;
const nextId = () => `srv_${Date.now()}_${(seq += 1)}`;

/**
 * Creates the mock transport. Latency, ack staging, typing indicators and
 * an occasional reconnect are simulated so the UI never assumes a perfect link.
 */
export function createMockSocket(opts?: { autoReply?: boolean }): ChatSocket {
  const autoReply = opts?.autoReply ?? true;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let state: SocketState = "connecting";
  let closed = false;

  const socket: ChatSocket = {
    get state() {
      return state;
    },
    send(event) {
      if (closed) return;
      handle(event);
    },
    close() {
      closed = true;
      timers.forEach(clearTimeout);
      timers.clear();
      setState("closed");
    },
  };

  function later(fn: () => void, ms: number) {
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (!closed) fn();
    }, ms);
    timers.add(timer);
    return timer;
  }

  function setState(next: SocketState) {
    state = next;
    socket.onstate?.(next);
  }

  function emit(event: ServerEvent) {
    socket.onmessage?.(event);
  }

  function handle(event: ClientEvent) {
    switch (event.t) {
      case "message.send": {
        const id = nextId();
        // sent → delivered → read, the way a real relay stages acks.
        later(() => emit({ t: "message.ack", clientId: event.clientId, id, status: "sent" }), 260);
        later(() => emit({ t: "message.ack", clientId: event.clientId, id, status: "delivered" }), 900);
        if (!autoReply) return;
        later(() => emit({ t: "typing", who: "coach", active: true }), 1400);
        later(() => emit({ t: "message.ack", clientId: event.clientId, id, status: "read" }), 1800);
        later(() => {
          emit({ t: "typing", who: "coach", active: false });
          emit({
            t: "message.new",
            message: {
              id: nextId(),
              author: "coach",
              text: COACH_REPLIES[Math.floor(Math.random() * COACH_REPLIES.length)],
              createdAt: new Date().toISOString(),
              status: "delivered",
            },
          });
        }, 3600 + Math.random() * 1200);
        break;
      }
      case "read.ack":
        later(() => emit({ t: "read", upTo: event.upTo }), 120);
        break;
      case "typing.start":
      case "typing.stop":
        // Forwarded to the coach's client in production; nothing to echo here.
        break;
      case "history.fetch":
        // Handled over REST in the hook; kept here for protocol parity.
        break;
    }
  }

  later(() => {
    setState("open");
    emit({ t: "presence", online: true, lastSeenLabel: "آنلاین" });
  }, 700);

  return socket;
}
