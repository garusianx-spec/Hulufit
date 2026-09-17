"use client";

import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { UploadTray } from "./UploadTray";
import { useToast } from "@/components/ui/Toast";
import { useChatSocket } from "@/lib/ws/useChatSocket";
import { useFileUpload } from "@/lib/upload/useFileUpload";
import { MAX_ATTACHMENT_BYTES } from "@/lib/upload/fileGuards";
import { chatThread } from "@/lib/mock/chat";
import type { Attachment, UploadTask } from "@/types";

/**
 * Consultation chat — composition root.
 *
 * Data flow
 *   Composer ──pick──▶ useFileUpload (30 MB guard → chunked upload → progress)
 *                            │ onComplete
 *                            ▼
 *   useChatSocket ──message.send──▶ socket ──ack──▶ optimistic bubble updates
 */
export function ChatScreen({ threadId }: { threadId: string }) {
  const toast = useToast();
  const thread = { ...chatThread, id: threadId };

  const {
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
    loadOlder,
  } = useChatSocket({ threadId });

  // Object URLs handed to the transcript outlive the upload task, so the
  // screen owns their lifetime and revokes them on unmount.
  const ownedUrls = useRef<string[]>([]);
  useEffect(
    () => () => {
      ownedUrls.current.forEach((url) => URL.revokeObjectURL(url));
      ownedUrls.current = [];
    },
    [],
  );

  const onUploadComplete = useCallback(
    (task: UploadTask) => {
      const url = task.kind === "image" ? URL.createObjectURL(task.file) : "#";
      if (url !== "#") ownedUrls.current.push(url);

      const attachment: Attachment = {
        // Production: the id the upload service returns for the finalised object.
        id: task.id,
        kind: task.kind,
        name: task.file.name,
        sizeBytes: task.file.size,
        mime: task.file.type,
        url,
        durationSec: task.kind === "audio" ? Math.round(task.file.size / 8000) : undefined,
      };

      sendAttachment(attachment);
      setTimeout(() => remove(task.id), 400);
    },
    [sendAttachment], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const { tasks, enqueue, cancel, retry, remove } = useFileUpload({
    maxBytes: MAX_ATTACHMENT_BYTES,
    allow: ["image", "pdf", "audio", "lab"],
    onRejected: (message) => toast.error(message),
    onComplete: onUploadComplete,
  });

  const offline = state === "closed" || state === "reconnecting";

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-canvas">
      <ChatHeader
        thread={thread}
        connectionLabel={connectionLabel}
        state={state}
        typing={coachTyping}
      />

      <AnimatePresence>
        {offline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-warn-50"
          >
            <p className="px-4 py-2 text-center text-2xs font-bold text-warn-600">
              اتصال برقرار نیست — پیام‌های شما در صف می‌مانند و پس از وصل شدن ارسال می‌شوند.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col overflow-hidden">
        <MessageList
          messages={messages}
          typing={coachTyping}
          coachName={thread.specialistName}
          hasMore={hasMore}
          loadingOlder={loadingOlder}
          onLoadOlder={loadOlder}
          onRetry={retryMessage}
        />

        <UploadTray tasks={tasks} onCancel={cancel} onRetry={retry} onRemove={remove} />

        <Composer
          onSendText={sendText}
          onPickFiles={enqueue}
          onTyping={notifyTyping}
          showQuickReplies={messages.length < 12}
        />
      </main>
    </div>
  );
}
