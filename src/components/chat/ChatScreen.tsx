"use client";

import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { UploadTray } from "./UploadTray";
import { useToast } from "@/components/ui/Toast";
import { useNotificationCenter } from "@/lib/notifications/NotificationProvider";
import { useChatSocket } from "@/lib/ws/useChatSocket";
import { useFileUpload } from "@/lib/upload/useFileUpload";
import { MAX_ATTACHMENT_BYTES } from "@/lib/upload/fileGuards";
import { chatThread } from "@/lib/mock/chat";
import { findPatient } from "@/lib/mock/patients";
import { PatientContextBar } from "@/components/doctor/PatientContextBar";
import { useAppStore } from "@/lib/store/AppStore";
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
export function ChatScreen({ threadId, patientId }: { threadId: string; patientId?: string }) {
  const toast = useToast();
  const { notify, channels } = useNotificationCenter();
  const { role } = useAppStore();

  // Opened from the specialist portal: the thread is the patient's, and the
  // outgoing side of the transcript flips to the clinician.
  const patient = patientId ? findPatient(patientId) : undefined;
  const asSpecialist = role === "specialist" && Boolean(patient);

  const thread = {
    ...chatThread,
    id: threadId,
    ...(asSpecialist && patient
      ? {
          specialistName: `${patient.firstName} ${patient.lastName}`,
          specialistTitle: "مراجع",
        }
      : {}),
  };

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

  /**
   * Incoming-message notifications.
   *
   * Only fires when the transcript isn't actually being read — a notification
   * for a message visible on screen is noise. The seed transcript is skipped by
   * priming the marker on mount.
   */
  const lastNotified = useRef<string | null>(null);
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;

    if (lastNotified.current === null) {
      lastNotified.current = last.id;
      return;
    }
    if (last.id === lastNotified.current) return;
    lastNotified.current = last.id;

    const incomingAuthor = asSpecialist ? "me" : "coach";
    if (last.author !== incomingAuthor || !channels.chat) return;
    if (typeof document !== "undefined" && document.visibilityState === "visible") return;

    void notify({
      channel: "chat",
      title: `پیام جدید از ${thread.specialistName}`,
      body: last.text || (last.attachment ? `فایل: ${last.attachment.name}` : "پیام جدید"),
      url: `/chat/${threadId}`,
      key: `chat:${last.id}`,
    });
  }, [messages, channels.chat, notify, thread.specialistName, threadId, asSpecialist]);

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

      {asSpecialist && patient && <PatientContextBar patient={patient} />}

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
          perspective={asSpecialist ? "specialist" : "client"}
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
