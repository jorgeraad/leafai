"use client"

import { useParams, usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { useChatSessions } from "@/hooks/use-chat-sessions"

export function WorkspaceShell({
  workspaceId,
  children,
}: {
  workspaceId: string
  children: React.ReactNode
}) {
  const params = useParams<{ chatId?: string }>()
  const pathname = usePathname()
  const isSettings = pathname.includes("/settings")
  const { sessions, createSession, isLoading } = useChatSessions(workspaceId)

  return (
    <div className="flex h-dvh">
      {!isSettings && (
        <Sidebar
          sessions={sessions}
          activeChatId={params.chatId ?? null}
          workspaceId={workspaceId}
          isLoading={isLoading}
          onNewChat={createSession}
        />
      )}
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  )
}
