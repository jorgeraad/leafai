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
  const { messages, sendMessage, isStreaming } = useChatStream(chatId)

  return (
    <>
      <ChatHeader title={null} />
      <MessageList messages={messages} isStreaming={isStreaming} className="flex-1" />
      <ChatInput onSend={sendMessage} isStreaming={isStreaming} />
    </>
  )
}
