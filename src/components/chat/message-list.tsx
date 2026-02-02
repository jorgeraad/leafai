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
  contentClassName?: string
}

export function MessageList({ messages, isStreaming, className, contentClassName }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <ScrollArea className={cn("flex-1", className)}>
      <div className={cn("flex flex-col gap-3 p-3 pb-24 md:gap-4 md:p-4", contentClassName)}>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
