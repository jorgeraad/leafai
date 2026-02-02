"use client"

import { useParams, usePathname, useRouter } from "next/navigation"
import { useRef, useState, useCallback } from "react"
import { Sidebar } from "@/components/sidebar"
import { MobileMenu } from "@/components/sidebar/mobile-menu"
import { useChatSessions } from "@/hooks/use-chat-sessions"
import { WorkspaceContext } from "./workspace-context"

export function WorkspaceShell({
  workspaceId,
  hasGoogleDrive,
  children,
}: {
  workspaceId: string
  hasGoogleDrive: boolean
  children: React.ReactNode
}) {
  const params = useParams<{ chatId?: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const isSettings = pathname.includes("/settings")
  const { sessions, createSession, addSession, updateSessionTitle, deleteSession, isLoading } = useChatSessions(workspaceId)
  const pendingMessageRef = useRef<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  function handleNewChat() {
    router.push(`/w/${workspaceId}`)
    setMobileMenuOpen(false)
  }

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])
  const openMobileMenu = useCallback(() => setMobileMenuOpen(true), [])

  return (
    <WorkspaceContext.Provider value={{ workspaceId, hasGoogleDrive, createSession, addSession, updateSessionTitle, deleteSession, pendingMessageRef, mobileMenuOpen, openMobileMenu, closeMobileMenu }}>
      <div className="flex h-dvh">
        {!isSettings && (
          <>
            <Sidebar
              sessions={sessions}
              activeChatId={params.chatId ?? null}
              workspaceId={workspaceId}
              isLoading={isLoading}
              onNewChat={handleNewChat}
            />
            <MobileMenu
              open={mobileMenuOpen}
              onClose={closeMobileMenu}
              sessions={sessions}
              activeChatId={params.chatId ?? null}
              workspaceId={workspaceId}
              isLoading={isLoading}
              onNewChat={handleNewChat}
            />
          </>
        )}
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </WorkspaceContext.Provider>
  )
}
