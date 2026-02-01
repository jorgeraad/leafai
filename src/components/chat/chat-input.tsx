"use client"

import { useState, type FormEvent } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SendHorizonal } from "lucide-react"

interface ChatInputProps {
  onSend: (content: string) => void
  isStreaming: boolean
  className?: string
}

export function ChatInput({ onSend, isStreaming, className }: ChatInputProps) {
  const [value, setValue] = useState("")

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setValue("")
  }

  return (
    <form
      data-slot="chat-input"
      onSubmit={handleSubmit}
      className={cn("flex items-center gap-2 border-t bg-background p-4", className)}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type a message…"
        disabled={isStreaming}
        className="flex-1 rounded-md border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
      />
      <Button type="submit" size="icon" disabled={isStreaming || !value.trim()}>
        <SendHorizonal />
      </Button>
    </form>
  )
}
