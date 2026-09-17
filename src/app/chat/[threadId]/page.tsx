"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ChatScreen } from "@/components/chat/ChatScreen";

function ChatRoute() {
  const params = useParams<{ threadId: string }>();
  const search = useSearchParams();
  const threadId = typeof params?.threadId === "string" ? params.threadId : "th_1";
  // Set when the specialist opens the thread from a patient's workspace.
  const patientId = search.get("patient") ?? undefined;

  return <ChatScreen threadId={threadId} patientId={patientId} />;
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-[100dvh] bg-canvas" />}>
      <ChatRoute />
    </Suspense>
  );
}
