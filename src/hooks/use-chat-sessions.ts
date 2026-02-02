"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { ChatSession } from "@/lib/types"

interface UseChatSessionsReturn {
  sessions: ChatSession[]
  createSession: () => Promise<ChatSession>
  addSession: (session: ChatSession) => void
  updateSessionTitle: (sessionId: string, title: string) => void
  bumpSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => Promise<void>
  isLoading: boolean
}

function rowToSession(row: Record<string, unknown>): ChatSession {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    title: row.title as string | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export function useChatSessions(workspaceId: string): UseChatSessionsReturn {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let cancelled = false

    async function fetchSessions() {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false })

      if (!cancelled && !error && data) {
        setSessions(data.map(rowToSession))
      }
      if (!cancelled) {
        setIsLoading(false)
      }
    }

    fetchSessions()
    return () => {
      cancelled = true
    }
  }, [workspaceId, supabase])

  const createSession = useCallback(async (): Promise<ChatSession> => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error("Not authenticated")

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ workspace_id: workspaceId })
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create session")
    }

    // Add the current user as a participant so RLS allows message reads
    await supabase
      .from("chat_participants")
      .insert({ chat_session_id: data.id, user_id: userData.user.id })

    const session = rowToSession(data)
    setSessions((prev) => [session, ...prev])
    return session
  }, [workspaceId, supabase])

  const addSession = useCallback((session: ChatSession) => {
    setSessions((prev) => [session, ...prev])
  }, [])

  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
    )
  }, [])

  const bumpSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === sessionId)
      if (idx <= 0) return prev
      const session = { ...prev[idx], updatedAt: new Date() }
      return [session, ...prev.slice(0, idx), ...prev.slice(idx + 1)]
    })
  }, [])

  const deleteSession = useCallback(async (sessionId: string) => {
    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", sessionId)

    if (error) throw new Error(error.message)

    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
  }, [supabase])

  return { sessions, createSession, addSession, updateSessionTitle, bumpSession, deleteSession, isLoading }
}
