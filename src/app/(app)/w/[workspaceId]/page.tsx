"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChatHeader, ChatInput } from "@/components/chat"
import { useWorkspace } from "./workspace-context"

export default function WorkspaceHomePage() {
  const { workspaceId, createSession, pendingMessageRef } = useWorkspace()
  const router = useRouter()
  const [isSending, setIsSending] = useState(false)

  async function handleSend(content: string) {
    if (isSending) return
    setIsSending(true)
    try {
      const session = await createSession()
      // Store the message so the chat page can send it on mount
      pendingMessageRef.current = content
      router.push(`/w/${workspaceId}/chat/${session.id}`)
    } catch {
      setIsSending(false)
    }
  }

  return (
    <>
      <ChatHeader title={null} />
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">
          Start a conversation below.
        </p>
      </div>
      <ChatInput onSend={handleSend} isStreaming={isSending} />
    </>
  )
}
