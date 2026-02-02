"use client"

import { createContext, useContext, useRef } from "react"
import type { ChatSession } from "@/lib/types"

interface WorkspaceContextValue {
  workspaceId: string
  createSession: () => Promise<ChatSession>
  addSession: (session: ChatSession) => void
  pendingMessageRef: React.RefObject<string | null>
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceShell")
  return ctx
}
