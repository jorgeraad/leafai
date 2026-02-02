"use client"

import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Message, MessagePart } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ToolCallCard } from "./tool-call-card"

interface MessageBubbleProps {
  message: Message
  className?: string
}

function ThinkingAnimation() {
  return (
    <div className="flex animate-fade-in-up justify-start px-4">
      <span className="inline-block relative text-base text-muted-foreground/70 select-none">
        <span className="relative overflow-hidden inline-block">
          <span>Thinking...</span>
          <span className="absolute inset-0 animate-[text-sheen_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-foreground/25 to-transparent bg-[length:50%_100%] bg-no-repeat [-webkit-background-clip:text] [background-clip:text]">
            Thinking...
          </span>
        </span>
      </span>
    </div>
  )
}

export function MessageBubble({ message, className }: MessageBubbleProps) {
  const isUser = message.role === "user"
  const isThinking =
    message.role === "assistant" &&
    message.status === "streaming" &&
    message.parts.filter((p) => p.type !== "tool-result").length === 0

  if (isThinking) {
    return <ThinkingAnimation />
  }

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
          "max-w-[90%] md:max-w-[80%] rounded-2xl px-3 py-2 md:px-4",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <div key={i} className={cn("prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:my-3 prose-pre:my-2 prose-p:leading-relaxed", isUser ? "prose-invert" : "dark:prose-invert")}>
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline decoration-blue-500/40 underline-offset-2 hover:decoration-blue-500 transition-colors"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >{part.text}</Markdown>
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
