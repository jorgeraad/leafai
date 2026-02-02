"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { ChatSession } from "@/lib/types"

interface SessionListProps {
  sessions: ChatSession[]
  activeChatId: string | null
  workspaceId: string
}

function SessionTitle({ title }: { title: string }) {
  const [visible, setVisible] = useState(title)
  const [fading, setFading] = useState(false)
  const prevRef = useRef(title)

  useEffect(() => {
    if (title === prevRef.current) return
    prevRef.current = title
    setFading(true)
    const timer = setTimeout(() => {
      setVisible(title)
      setFading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [title])

  return (
    <span
      className={cn(
        "inline-block transition-opacity duration-200",
        fading ? "opacity-0" : "opacity-100"
      )}
    >
      {visible}
    </span>
  )
}

export function SessionList({
  sessions,
  activeChatId,
  workspaceId,
}: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <p className="px-3 py-2 text-sm text-muted-foreground">No chats yet</p>
    )
  }

  return (
    <ul className="flex flex-col gap-0.5" role="list">
      {sessions.map((session, index) => {
        const isActive = session.id === activeChatId
        return (
          <li
            key={session.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <Link
              href={`/w/${workspaceId}/chat/${session.id}`}
              className={cn(
                "block truncate rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <SessionTitle title={session.title ?? "New Chat"} />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
