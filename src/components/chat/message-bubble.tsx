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
        {!isUser && message.status === "error" && (
          <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            <span>An error occurred while generating this response.</span>
          </div>
        )}
      </div>
    </div>
  )
}
