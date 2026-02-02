"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { cn } from "@/lib/utils"
import { ArrowUp } from "lucide-react"

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
    <div
      data-slot="chat-input"
      className={cn(
        "pointer-events-none relative animate-fade-in px-3 pb-3 md:px-4 md:pb-4",
        className
      )}
    >
      <form
        onSubmit={handleSubmit}
        className="pointer-events-auto relative flex items-center gap-2 rounded-xl border bg-background px-4 py-2 shadow-sm"
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type a message…"
          autoFocus
          className="flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={isStreaming || !value.trim()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
