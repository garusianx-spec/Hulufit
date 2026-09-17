"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Attachment, ChatMessage, MessageStatus } from "@/types";
import { chatHistoryPage, seedMessages } from "@/lib/mock/chat";
import { createMockSocket, type ChatSocket, type ServerEvent, type SocketState } from "./mockSocket";

/**
 * Owns the whole realtime surface of the consultation screen:
 * live send/ack, typing indicators, read receipts, presence, and the
 * REST-paginated history fallback used when scrolling to the top.
 *
 * Swapping to production = replacing `createMockSocket()` with
 * `new WebSocket(wsUrl)` and `loadOlder()`'s mock call with a real fetch.
 */

const TYPING_DEBOUNCE_MS = 1600;

export interface UseChatSocketOptions {
  threadId: string;
  /** Production: wss://api.hellofit.app/v1/threads/:id — unused in mock mode. */
  wsUrl?: string;
}

export function useChatSocket({ threadId }: UseChatSocketOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(seedMessages);
  const [state, setState] = useState<SocketState>("connecting");
  const [coachTyping, setCoachTyping] = useState(false);
  const [presence, setPresence] = useState({ online: false, lastSeenLabel: "در حال اتصال…" });
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const socketRef = useRef<ChatSocket | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSent = useRef(false);

  /* ------------------------------ connection ----------------------------- */

  useEffect(() => {
    const socket = createMockSocket();
    socketRef.current = socket;

    socket.onstate = (next) => setState(next);
    socket.onmessage = (event: ServerEvent) => {
      switch (event.t) {
        case "message.new":
          setMessages((prev) => [...prev, event.message]);
          // We are looking at the thread, so acknowledge immediately.
          socket.send({ t: "read.ack", upTo: event.message.id });
          break;

        case "message.ack":
          setMessages((prev) =>
            prev.map((m) =>
              m.clientId === event.clientId ? { ...m, id: event.id, status: event.status } : m,
            ),
          );
          break;

        case "typing":
          setCoachTyping(event.active);
          break;

        case "read":
          setMessages((prev) =>
            prev.map((m) => (m.author === "me" && m.status !== "read" ? { ...m, status: "read" } : m)),
          );
          break;

        case "presence":
          setPresence({ online: event.online, lastSeenLabel: event.lastSeenLabel });
          break;

        case "history.page":
          setMessages((prev) => [...event.messages, ...prev]);
          setHasMore(event.hasMore);
          break;
      }
    };

    return () => {
      socket.close();
      socketRef.current = null;
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [threadId]);

  /* -------------------------------- sending ------------------------------ */

  const pushOutgoing = useCallback((partial: Partial<ChatMessage>): ChatMessage => {
    const clientId = `cli_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const optimistic: ChatMessage = {
      id: clientId,
      clientId,
      author: "me",
      createdAt: new Date().toISOString(),
      status: socketRef.current?.state === "open" ? "sending" : "queued",
      ...partial,
    };
    setMessages((prev) => [...prev, optimistic]);
    return optimistic;
  }, []);

  const sendText = useCallback(
    (text: string, replyTo?: ChatMessage["replyTo"]) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const optimistic = pushOutgoing({ text: trimmed, replyTo });
      socketRef.current?.send({ t: "message.send", clientId: optimistic.clientId!, text: trimmed });
      stopTyping();
    },
    [pushOutgoing], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /** Called once the 30 MB-guarded upload has finished and has a server id. */
  const sendAttachment = useCallback(
    (attachment: Attachment, caption?: string) => {
      const optimistic = pushOutgoing({ attachment, text: caption });
      socketRef.current?.send({
        t: "message.send",
        clientId: optimistic.clientId!,
        attachmentId: attachment.id,
        text: caption,
      });
    },
    [pushOutgoing],
  );

  const retryMessage = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "sending" as MessageStatus } : m)),
    );
    const message = messages.find((m) => m.id === id);
    if (message?.clientId) {
      socketRef.current?.send({
        t: "message.send",
        clientId: message.clientId,
        text: message.text,
        attachmentId: message.attachment?.id,
      });
    }
  }, [messages]);

  /* ------------------------------- typing -------------------------------- */

  const stopTyping = useCallback(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (typingSent.current) {
      socketRef.current?.send({ t: "typing.stop" });
      typingSent.current = false;
    }
  }, []);

  const notifyTyping = useCallback(() => {
    if (!typingSent.current) {
      socketRef.current?.send({ t: "typing.start" });
      typingSent.current = true;
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, TYPING_DEBOUNCE_MS);
  }, [stopTyping]);

  /* ----------------------- paginated history (REST) ---------------------- */

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      // Production: await fetch(`/api/threads/${threadId}/messages?before=${cursor}&limit=12`)
      await new Promise((r) => setTimeout(r, 650));
      const page = chatHistoryPage(messages[0].createdAt, 12);
      setMessages((prev) => [...page.messages, ...prev]);
      setHasMore(page.hasMore);
    } finally {
      setLoadingOlder(false);
    }
  }, [hasMore, loadingOlder, messages]);

  /* ------------------------------ read acks ------------------------------ */

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.author === "coach" && state === "open") {
      socketRef.current?.send({ t: "read.ack", upTo: last.id });
    }
  }, [messages, state]);

  const connectionLabel = useMemo(() => {
    if (state === "open") return presence.online ? "آنلاین" : presence.lastSeenLabel;
    if (state === "connecting") return "در حال اتصال…";
    if (state === "reconnecting") return "اتصال مجدد…";
    return "آفلاین";
  }, [presence, state]);

  return {
    messages,
    state,
    connectionLabel,
    coachTyping,
    hasMore,
    loadingOlder,
    sendText,
    sendAttachment,
    retryMessage,
    notifyTyping,
    stopTyping,
    loadOlder,
  };
}
