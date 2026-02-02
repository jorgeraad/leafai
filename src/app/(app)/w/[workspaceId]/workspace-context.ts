"use client"

import { createContext, useContext, useRef } from "react"
import type { ChatSession } from "@/lib/types"

interface WorkspaceContextValue {
  workspaceId: string
  hasGoogleDrive: boolean
  createSession: () => Promise<ChatSession>
  addSession: (session: ChatSession) => void
  updateSessionTitle: (sessionId: string, title: string) => void
  bumpSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => Promise<void>
  pendingMessageRef: React.RefObject<string | null>
  mobileMenuOpen: boolean
  openMobileMenu: () => void
  closeMobileMenu: () => void
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceShell")
  return ctx
}
