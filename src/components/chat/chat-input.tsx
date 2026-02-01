"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
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
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep input focused after sending or when streaming state changes
  useEffect(() => {
    inputRef.current?.focus()
  }, [isStreaming])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setValue("")
    // Refocus after send
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <form
      data-slot="chat-input"
      onSubmit={handleSubmit}
      className={cn("flex items-center gap-2 border-t bg-background p-4 animate-fade-in", className)}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type a message…"
        autoFocus
        className="flex-1 rounded-md border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
      />
      <Button type="submit" size="icon" disabled={isStreaming || !value.trim()}>
        <SendHorizonal />
      </Button>
    </form>
  )
}
