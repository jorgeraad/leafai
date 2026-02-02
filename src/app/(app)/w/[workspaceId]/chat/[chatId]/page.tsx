"use client"

import { use, useEffect, useRef } from "react"
import { ChatHeader, ChatInput, MessageList } from "@/components/chat"
import { useChatStream } from "@/hooks/use-chat-stream"
import { useWorkspace } from "../../workspace-context"

export default function ChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  const { chatId } = use(params)
  const { messages, sendMessage, isStreaming, error } = useChatStream(chatId)
  const { pendingMessageRef } = useWorkspace()
  const sentPending = useRef(false)

  // Auto-send pending message from lazy session creation
  useEffect(() => {
    if (sentPending.current) return
    const content = pendingMessageRef.current
    if (content) {
      sentPending.current = true
      pendingMessageRef.current = null
      sendMessage(content)
    }
  }, [pendingMessageRef, sendMessage])

  return (
    <div className="flex h-full flex-col">
      <ChatHeader title={null} />
      <MessageList messages={messages} isStreaming={isStreaming} className="flex-1" />
      {error && (
        <div className="mx-4 mb-2 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error.message}
        </div>
      )}
      <ChatInput onSend={sendMessage} isStreaming={isStreaming} />
    </div>
  )
}
