"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { AssistantMessage, Message, MessagePart } from "@/lib/types"

interface UseChatStreamReturn {
  messages: Message[]
  sendMessage: (content: string) => Promise<void>
  isStreaming: boolean
  error: Error | null
}

export function useChatStream(chatSessionId: string): UseChatStreamReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Fetch messages on mount
  useEffect(() => {
    let cancelled = false

    async function fetchMessages() {
      try {
        const supabase = createClient()
        const { data, error: dbError } = await supabase
          .from("messages")
          .select("*")
          .eq("chat_session_id", chatSessionId)
          .order("created_at", { ascending: true })

        if (cancelled) return
        if (dbError) throw dbError

        const mapped: Message[] = (data ?? []).map(mapRowToMessage)
        setMessages(mapped)

        // Reconnect if latest message is still streaming
        const latest = mapped[mapped.length - 1]
        if (latest && latest.role === "assistant" && latest.status === "streaming") {
          reconnect(latest as AssistantMessage)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)))
      }
    }

    fetchMessages()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatSessionId])

  function reconnect(msg: AssistantMessage) {
    setIsStreaming(true)
    const eventSource = new EventSource(
      `/api/runs/${msg.workflowRunId}?startIndex=0`
    )

    eventSource.onmessage = (event) => {
      const chunk = JSON.parse(event.data) as MessagePart
      setMessages((prev) => {
        const updated = [...prev]
        const idx = updated.findIndex((m) => m.id === msg.id)
        if (idx !== -1) {
          const existing = updated[idx] as AssistantMessage
          updated[idx] = { ...existing, parts: [...existing.parts, chunk] }
        }
        return updated
      })
    }

    eventSource.addEventListener("done", () => {
      eventSource.close()
      setIsStreaming(false)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, status: "completed" as const } : m
        )
      )
    })

    eventSource.onerror = () => {
      eventSource.close()
      setIsStreaming(false)
    }
  }

  const sendMessage = useCallback(
    async (content: string) => {
      setError(null)
      setIsStreaming(true)

      // Optimistic user message
      const tempId = `temp-${Date.now()}`
      const userMessage: Message = {
        id: tempId,
        chatSessionId,
        role: "user",
        senderId: "self",
        status: "completed",
        parts: [{ type: "text", text: content }],
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])

      // Placeholder assistant message
      const assistantTempId = `temp-assistant-${Date.now()}`
      const assistantMessage: AssistantMessage = {
        id: assistantTempId,
        chatSessionId,
        role: "assistant",
        workflowRunId: "",
        status: "streaming",
        parts: [],
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])

      try {
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatSessionId, content }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Chat request failed: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No response body")

        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            const payload = line.slice(6)
            if (payload === "[DONE]") continue

            try {
              const chunk = JSON.parse(payload) as MessagePart
              setMessages((prev) => {
                const updated = [...prev]
                const idx = updated.findIndex((m) => m.id === assistantTempId)
                if (idx !== -1) {
                  const existing = updated[idx] as AssistantMessage
                  updated[idx] = {
                    ...existing,
                    parts: [...existing.parts, chunk],
                  }
                }
                return updated
              })
            } catch {
              // skip malformed chunks
            }
          }
        }

        // Mark completed
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantTempId
              ? { ...m, status: "completed" as const }
              : m
          )
        )
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err : new Error(String(err)))
          // Remove placeholder assistant message on error
          setMessages((prev) => prev.filter((m) => m.id !== assistantTempId))
        }
      } finally {
        setIsStreaming(false)
      }
    },
    [chatSessionId]
  )

  return { messages, sendMessage, isStreaming, error }
}

// Map a Supabase row to our Message type
function mapRowToMessage(row: Record<string, unknown>): Message {
  const base = {
    id: row.id as string,
    chatSessionId: row.chat_session_id as string,
    parts: (row.parts ?? []) as MessagePart[],
    createdAt: new Date(row.created_at as string),
  }

  if (row.role === "user") {
    return {
      ...base,
      role: "user",
      senderId: row.sender_id as string,
      status: "completed",
    }
  }

  return {
    ...base,
    role: "assistant",
    workflowRunId: row.workflow_run_id as string,
    status: row.status as AssistantMessage["status"],
  }
}
