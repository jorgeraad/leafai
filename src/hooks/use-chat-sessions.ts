"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { ChatSession } from "@/lib/types"

interface UseChatSessionsReturn {
  sessions: ChatSession[]
  createSession: () => Promise<ChatSession>
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
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ workspace_id: workspaceId })
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create session")
    }

    const session = rowToSession(data)
    setSessions((prev) => [session, ...prev])
    router.push(`/w/${workspaceId}/chat/${session.id}`)
    return session
  }, [workspaceId, supabase, router])

  return { sessions, createSession, isLoading }
}
