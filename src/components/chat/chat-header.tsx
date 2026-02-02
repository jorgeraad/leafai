"use client"

import { useEffect, useRef, useState } from "react"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { LeafLogo } from "@/components/icons/leaf-logo"
import { ShareDialog } from "./share-dialog"
import { useWorkspace } from "@/app/(app)/w/[workspaceId]/workspace-context"

interface ChatHeaderProps {
  title: string | null | undefined
  chatSessionId?: string
  sessionUpdatedAt?: Date
  className?: string
}

export function ChatHeader({ title, chatSessionId, sessionUpdatedAt, className }: ChatHeaderProps) {
  const { openMobileMenu } = useWorkspace()
  // undefined = still loading (show nothing), null = no title, string = has title
  const display = title === undefined ? "" : (title ?? "New Chat")
  const [visible, setVisible] = useState(display)
  const [fading, setFading] = useState(false)
  const prevTitle = useRef(display)

  useEffect(() => {
    if (display === prevTitle.current) return
    prevTitle.current = display
    // Fade out, swap text, fade in
    setFading(true)
    const timer = setTimeout(() => {
      setVisible(display)
      setFading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [display])

  return (
    <div
      data-slot="chat-header"
      className={cn(
        "flex items-center justify-between border-b bg-background px-4 py-3 font-semibold animate-fade-in",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <LeafLogo className="size-4 shrink-0 text-green-600 md:hidden" />
        <span
          className={cn(
            "inline-block transition-opacity duration-200 truncate",
            fading ? "opacity-0" : "opacity-100"
          )}
        >
          {visible}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {chatSessionId && sessionUpdatedAt && (
          <ShareDialog chatSessionId={chatSessionId} sessionUpdatedAt={sessionUpdatedAt} />
        )}
        <button
          onClick={openMobileMenu}
          className="flex items-center justify-center rounded-md p-1 hover:bg-accent/50 transition-colors md:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
      </div>
    </div>
  )
}
