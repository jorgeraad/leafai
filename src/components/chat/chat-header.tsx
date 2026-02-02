"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface ChatHeaderProps {
  title: string | null | undefined
  className?: string
}

export function ChatHeader({ title, className }: ChatHeaderProps) {
  // undefined = still loading (show nothing), null = no title, string = has title
  const display = title === undefined ? "" : (title ?? "New Chat")
  const [visible, setVisible] = useState(display)
  const [fading, setFading] = useState(false)
  const prevTitle = useRef(display)

  useEffect(() => {
    if (display === prevTitle.current) return
    prevTitle.current = display
    // Fade out, swap text, fade in
    setFading(true)
    const timer = setTimeout(() => {
      setVisible(display)
      setFading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [display])

  return (
    <div
      data-slot="chat-header"
      className={cn(
        "border-b bg-background px-4 py-3 font-semibold animate-fade-in",
        className
      )}
    >
      <span
        className={cn(
          "inline-block transition-opacity duration-200",
          fading ? "opacity-0" : "opacity-100"
        )}
      >
        {visible}
      </span>
    </div>
  )
}
