"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import type { ChatSession } from "@/lib/types"

interface SessionListProps {
  sessions: ChatSession[]
  activeChatId: string | null
  workspaceId: string
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
      {sessions.map((session) => {
        const isActive = session.id === activeChatId
        return (
          <li key={session.id}>
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
              {session.title ?? "Untitled Chat"}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
