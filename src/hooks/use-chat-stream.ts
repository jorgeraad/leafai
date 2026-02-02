"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { AssistantMessage, Message, MessagePart } from "@/lib/types"

interface UseChatStreamReturn {
  messages: Message[]
  sendMessage: (content: string) => Promise<void>
  isStreaming: boolean
  error: Error | null
  dismissError: () => void
}

export function useChatStream(chatSessionId: string): UseChatStreamReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const streamingRef = useRef(false)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Helper: set error with auto-dismiss after 10 seconds
  function setErrorWithAutoDismiss(err: Error) {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    setError(err)
    errorTimerRef.current = setTimeout(() => setError(null), 10_000)
  }

  // Fetch messages on mount
  useEffect(() => {
    let cancelled = false

    async function fetchMessages() {
      // If sendMessage is already in flight (e.g. from pending message),
      // skip the fetch — optimistic state is the source of truth.
      if (streamingRef.current) return

      try {
        const supabase = createClient()
        const { data, error: dbError } = await supabase
          .from("messages")
          .select("*")
          .eq("chat_session_id", chatSessionId)
          .order("created_at", { ascending: true })

        if (cancelled || streamingRef.current) return
        if (dbError) throw dbError

        const mapped: Message[] = (data ?? []).map(mapRowToMessage).filter(
          (m) => !(m.role === "assistant" && m.status === "pending") &&
                 !(m.role === "assistant" && m.status === "error" && m.parts.length === 0)
        )
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
      try {
        const chunk = JSON.parse(event.data)

        if (chunk.type === "error") {
          setErrorWithAutoDismiss(new Error(chunk.message ?? "Workflow error"))
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.id
                ? { ...(m as AssistantMessage), status: "error" as const }
                : m
            ).filter((m) => !(m.id === msg.id && m.parts.length === 0))
          )
          eventSource.close()
          setIsStreaming(false)
          return
        }

        setMessages((prev) => {
          const updated = [...prev]
          const idx = updated.findIndex((m) => m.id === msg.id)
          if (idx !== -1) {
            const existing = updated[idx] as AssistantMessage
            const newParts = [...existing.parts]

            if (chunk.type === "text-delta") {
              const last = newParts[newParts.length - 1]
              if (last && last.type === "text") {
                newParts[newParts.length - 1] = { ...last, text: last.text + chunk.text }
              } else {
                newParts.push({ type: "text", text: chunk.text })
              }
            } else {
              newParts.push(chunk as MessagePart)
            }

            updated[idx] = { ...existing, parts: newParts }
          }
          return updated
        })
      } catch {
        // skip malformed chunks
      }
    }

    eventSource.addEventListener("done", () => {
      eventSource.close()
      setIsStreaming(false)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id && m.status !== "error"
            ? { ...(m as AssistantMessage), status: "completed" as const }
            : m
        )
      )
    })

    eventSource.onerror = () => {
      eventSource.close()
      setIsStreaming(false)
      setErrorWithAutoDismiss(new Error("Connection lost while streaming"))
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? { ...(m as AssistantMessage), status: "error" as const }
            : m
        ).filter((m) => !(m.id === msg.id && m.parts.length === 0))
      )
    }
  }

  const sendMessage = useCallback(
    async (content: string) => {
      setError(null)
      setIsStreaming(true)
      streamingRef.current = true

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
              const chunk = JSON.parse(payload)

              if (chunk.type === "error") {
                setErrorWithAutoDismiss(new Error(chunk.message ?? "Workflow error"))
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantTempId
                      ? { ...(m as AssistantMessage), status: "error" as const }
                      : m
                  ).filter((m) => !(m.id === assistantTempId && m.parts.length === 0))
                )
                continue
              }

              setMessages((prev) => {
                const updated = [...prev]
                const idx = updated.findIndex((m) => m.id === assistantTempId)
                if (idx !== -1) {
                  const existing = updated[idx] as AssistantMessage
                  const newParts = [...existing.parts]

                  if (chunk.type === "text-delta") {
                    // Accumulate text deltas into the last text part
                    const last = newParts[newParts.length - 1]
                    if (last && last.type === "text") {
                      newParts[newParts.length - 1] = { ...last, text: last.text + chunk.text }
                    } else {
                      newParts.push({ type: "text", text: chunk.text })
                    }
                  } else {
                    newParts.push(chunk as MessagePart)
                  }

                  updated[idx] = { ...existing, parts: newParts }
                }
                return updated
              })
            } catch {
              // skip malformed chunks
            }
          }
        }

        // Mark completed (message may have been removed on error)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantTempId && m.status === "streaming"
              ? { ...(m as AssistantMessage), status: "completed" as const }
              : m
          )
        )
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setErrorWithAutoDismiss(err instanceof Error ? err : new Error(String(err)))
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantTempId
                ? { ...(m as AssistantMessage), status: "error" as const }
                : m
            ).filter((m) => !(m.id === assistantTempId && m.parts.length === 0))
          )
        }
      } finally {
        streamingRef.current = false
        setIsStreaming(false)
      }
    },
    [chatSessionId]
  )

  const dismissError = useCallback(() => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    setError(null)
  }, [])

  return { messages, sendMessage, isStreaming, error, dismissError }
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
