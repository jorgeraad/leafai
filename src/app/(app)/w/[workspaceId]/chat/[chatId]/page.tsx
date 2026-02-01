"use client"

import { use } from "react"
import { ChatHeader, ChatInput, MessageList } from "@/components/chat"
import { useChatStream } from "@/hooks/use-chat-stream"

export default function ChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  const { chatId } = use(params)
  const { messages, sendMessage, isStreaming, error } = useChatStream(chatId)

  return (
    <>
      <ChatHeader title={null} />
      <MessageList messages={messages} isStreaming={isStreaming} className="flex-1" />
      {error && (
        <div className="mx-4 mb-2 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error.message}
        </div>
      )}
      <ChatInput onSend={sendMessage} isStreaming={isStreaming} />
    </>
  )
}
