"use client"

import { useEffect } from "react"
import { X, Plus, Settings } from "lucide-react"
import { LeafLogo } from "@/components/icons/leaf-logo"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { SessionList } from "./session-list"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { ChatSession } from "@/lib/types"

interface MobileMenuProps {
  open: boolean
  onClose: () => void
  sessions: ChatSession[]
  activeChatId: string | null
  workspaceId: string
  isLoading: boolean
  onNewChat: () => void
}

export function MobileMenu({
  open,
  onClose,
  sessions,
  activeChatId,
  workspaceId,
  isLoading,
  onNewChat,
}: MobileMenuProps) {
  // Prevent body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-background transition-transform duration-200 ease-out md:hidden",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <button
          onClick={onNewChat}
          className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-accent/50 transition-colors"
        >
          <LeafLogo className="size-5 text-green-600" />
          <span className="text-lg font-semibold">Leaf</span>
        </button>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close menu">
          <X className="size-5" />
        </Button>
      </div>

      {/* New Chat */}
      <div className="px-4 pt-3">
        <button
          onClick={onNewChat}
          className="flex w-full items-center gap-2 rounded-md bg-foreground px-3 py-2.5 text-sm text-background transition-colors hover:bg-foreground/90"
        >
          <Plus className="size-4" />
          New Chat
        </button>
      </div>

      {/* Session list */}
      <ScrollArea className="flex-1 px-4 py-3">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <SessionList
            sessions={sessions}
            activeChatId={activeChatId}
            workspaceId={workspaceId}
            onSessionClick={onClose}
          />
        )}
      </ScrollArea>

      {/* Settings */}
      <div className="border-t px-4 py-3">
        <Link href={`/w/${workspaceId}/settings/integrations`} onClick={onClose}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            aria-label="Settings"
          >
            <Settings className="size-4" />
            Settings
          </Button>
        </Link>
      </div>
    </div>
  )
}
