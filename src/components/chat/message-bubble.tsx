"use client"

import Markdown from "react-markdown"
import type { Message, MessagePart } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ToolCallCard } from "./tool-call-card"

interface MessageBubbleProps {
  message: Message
  className?: string
}

export function MessageBubble({ message, className }: MessageBubbleProps) {
  const isUser = message.role === "user"

  // Build a map of tool results keyed by toolCallId for quick lookup
  const toolResults = new Map<string, Extract<MessagePart, { type: "tool-result" }>>()
  for (const part of message.parts) {
    if (part.type === "tool-result") {
      toolResults.set(part.toolCallId, part)
    }
  }

  return (
    <div
      data-slot="message-bubble"
      data-role={message.role}
      className={cn(
        "flex animate-fade-in-up",
        isUser ? "justify-end" : "justify-start",
        className
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <div key={i} className="prose prose-sm dark:prose-invert max-w-none">
                <Markdown>{part.text}</Markdown>
              </div>
            )
          }
          if (part.type === "tool-call") {
            return (
              <ToolCallCard
                key={part.toolCallId}
                toolCall={part}
                toolResult={toolResults.get(part.toolCallId)}
                className="my-2"
              />
            )
          }
          // tool-result parts are rendered inline with their tool-call
          return null
        })}
      </div>
    </div>
  )
}
