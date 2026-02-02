"use client"

import { use, useCallback, useEffect, useRef, useState } from "react"
import { ChatHeader, ChatInput, MessageList } from "@/components/chat"
import { useChatStream } from "@/hooks/use-chat-stream"
import { createClient } from "@/lib/supabase/client"
import { useWorkspace } from "../../workspace-context"

export default function ChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  const { chatId } = use(params)
  const { messages, sendMessage, isStreaming, error, dismissError } = useChatStream(chatId)
  // Track visible error separately so fade-out animation can play before unmount
  const [visibleError, setVisibleError] = useState<Error | null>(null)
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    if (error) {
      setIsFadingOut(false)
      setVisibleError(error)
    } else if (visibleError) {
      setIsFadingOut(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])
  const { pendingMessageRef, updateSessionTitle, bumpSession } = useWorkspace()
  const sentPending = useRef(false)
  const [title, setTitle] = useState<string | null | undefined>(undefined)
  const [sessionUpdatedAt, setSessionUpdatedAt] = useState<Date>(new Date())
  const wasStreamingRef = useRef(false)

  // Fetch existing title on mount (covers page reload)
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase
      .from("chat_sessions")
      .select("title, updated_at")
      .eq("id", chatId)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          setTitle(data?.title ?? null)
          if (data?.updated_at) setSessionUpdatedAt(new Date(data.updated_at))
        }
      })
    return () => { cancelled = true }
  }, [chatId])

  // After streaming ends, poll for a generated title
  useEffect(() => {
    if (isStreaming) {
      wasStreamingRef.current = true
      return
    }
    if (!wasStreamingRef.current) return
    wasStreamingRef.current = false
    setSessionUpdatedAt(new Date())
    if (title) return

    let cancelled = false
    const supabase = createClient()

    // Title generation runs in `after()` on the server — it waits for the
    // workflow to finish, then generates. Poll a few times to pick it up.
    const timer = setTimeout(async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        if (cancelled) return
        const { data } = await supabase
          .from("chat_sessions")
          .select("title")
          .eq("id", chatId)
          .single()
        if (data?.title) {
          if (!cancelled) {
            setTitle(data.title)
            updateSessionTitle(chatId, data.title)
          }
          return
        }
        await new Promise((r) => setTimeout(r, 2000))
      }
    }, 2000)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [isStreaming, chatId, title, updateSessionTitle])

  const handleSend = useCallback((content: string) => {
    bumpSession(chatId)
    return sendMessage(content)
  }, [bumpSession, chatId, sendMessage])

  // Auto-send pending message from lazy session creation
  useEffect(() => {
    if (sentPending.current) return
    const content = pendingMessageRef.current
    if (content) {
      sentPending.current = true
      pendingMessageRef.current = null
      handleSend(content)
    }
  }, [pendingMessageRef, handleSend])

  return (
    <div className="flex h-full flex-col">
      <ChatHeader title={title} chatSessionId={chatId} sessionUpdatedAt={sessionUpdatedAt} />
      <div className="relative min-h-0 flex-1">
        <MessageList messages={messages} isStreaming={isStreaming} className="h-full" contentClassName="mx-auto max-w-5xl px-8 sm:px-12 md:px-16" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 mx-auto max-w-5xl px-8 sm:px-12 md:px-16 flex flex-col items-start">
          {visibleError && (
        <div
          className={`pointer-events-auto mx-4 mb-2 inline-flex max-w-lg items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm text-destructive ${
            isFadingOut ? "animate-fade-out-down" : "animate-fade-in-up"
          }`}
          onAnimationEnd={() => {
            if (isFadingOut) {
              setVisibleError(null)
              setIsFadingOut(false)
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <span className="flex-1">{visibleError.message}</span>
          <button
            type="button"
            onClick={dismissError}
            className="shrink-0 rounded-md p-0.5 text-destructive/60 transition-colors hover:text-destructive"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      )}
          <ChatInput onSend={handleSend} isStreaming={isStreaming} className="w-full" />
        </div>
      </div>
    </div>
  )
}
