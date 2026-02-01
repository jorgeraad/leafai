"use client"

import { cn } from "@/lib/utils"

interface ChatHeaderProps {
  title: string | null
  className?: string
}

export function ChatHeader({ title, className }: ChatHeaderProps) {
  return (
    <div
      data-slot="chat-header"
      className={cn(
        "border-b bg-background px-4 py-3 font-semibold animate-fade-in",
        className
      )}
    >
      {title ?? "New Chat"}
    </div>
  )
}
