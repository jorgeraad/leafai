"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChatHeader, ChatInput } from "@/components/chat"
import { useWorkspace } from "./workspace-context"

export default function WorkspaceHomePage() {
  const { workspaceId, hasGoogleDrive, createSession, pendingMessageRef } = useWorkspace()
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
        <div className="max-w-md animate-fade-in-up text-center">
          {hasGoogleDrive ? (
            <>
              <h2 className="text-lg font-semibold">Talk to your files</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask questions about your Google Drive documents, summarize files, or explore your content — just start typing below.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Get started</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect your Google Drive in{" "}
                <Link href={`/w/${workspaceId}/settings/integrations`} className="underline underline-offset-2 hover:text-foreground">
                  Settings
                </Link>{" "}
                to chat with your files. Or just start a conversation below.
              </p>
            </>
          )}
        </div>
      </div>
      <div className="mx-auto w-full max-w-5xl px-8 sm:px-12 md:px-16">
        <ChatInput onSend={handleSend} isStreaming={isSending} className="w-full" />
      </div>
    </>
  )
}
