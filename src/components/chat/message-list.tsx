"use client"

import { useEffect, useRef } from "react"
import type { Message } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageBubble } from "./message-bubble"

interface MessageListProps {
  messages: Message[]
  isStreaming: boolean
  className?: string
}

export function MessageList({ messages, isStreaming, className }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <ScrollArea className={cn("flex-1", className)}>
      <div className="flex flex-col gap-4 p-4 pb-20">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
