"use client";

import { useParams } from "next/navigation";
import { ChatScreen } from "@/components/chat/ChatScreen";

export default function ChatPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = typeof params?.threadId === "string" ? params.threadId : "th_1";
  return <ChatScreen threadId={threadId} />;
}
