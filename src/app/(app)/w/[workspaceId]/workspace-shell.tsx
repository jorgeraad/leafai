"use client"

import { useParams, usePathname, useRouter } from "next/navigation"
import { useRef } from "react"
import { Sidebar } from "@/components/sidebar"
import { useChatSessions } from "@/hooks/use-chat-sessions"
import { WorkspaceContext } from "./workspace-context"

export function WorkspaceShell({
  workspaceId,
  children,
}: {
  workspaceId: string
  children: React.ReactNode
}) {
  const params = useParams<{ chatId?: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const isSettings = pathname.includes("/settings")
  const { sessions, createSession, addSession, isLoading } = useChatSessions(workspaceId)
  const pendingMessageRef = useRef<string | null>(null)

  function handleNewChat() {
    router.push(`/w/${workspaceId}`)
  }

  return (
    <WorkspaceContext.Provider value={{ workspaceId, createSession, addSession, pendingMessageRef }}>
      <div className="flex h-dvh">
        {!isSettings && (
          <Sidebar
            sessions={sessions}
            activeChatId={params.chatId ?? null}
            workspaceId={workspaceId}
            isLoading={isLoading}
            onNewChat={handleNewChat}
          />
        )}
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </WorkspaceContext.Provider>
  )
}
