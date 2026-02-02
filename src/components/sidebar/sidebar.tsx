"use client"

import { useState } from "react"
import { PanelLeftClose, PanelLeft, Plus, Settings } from "lucide-react"
import { LeafLogo } from "@/components/icons/leaf-logo"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { SessionList } from "./session-list"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { ChatSession } from "@/lib/types"

interface SidebarProps {
  sessions: ChatSession[]
  activeChatId: string | null
  workspaceId: string
  isLoading: boolean
  onNewChat: () => void
}

export function Sidebar({
  sessions,
  activeChatId,
  workspaceId,
  isLoading,
  onNewChat,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [hovered, setHovered] = useState(false)

  return (
    <aside
      className={cn(
        "hidden md:flex h-full flex-col border-r bg-background transition-[width] duration-200 animate-fade-in",
        collapsed ? "w-12" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b p-2">
        {collapsed ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCollapsed(false)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            aria-label="Expand sidebar"
          >
            {hovered ? (
              <PanelLeft className="size-4" />
            ) : (
              <LeafLogo className="size-4 text-green-600" />
            )}
          </Button>
        ) : (
          <>
            <button
              onClick={onNewChat}
              className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-accent/50 transition-colors"
            >
              <LeafLogo className="size-4 text-green-600" />
              <span className="font-semibold">Leaf</span>
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          </>
        )}
      </div>

      {/* New Chat button (expanded only) */}
      {!collapsed && (
        <div className="px-2 pt-2">
          <button
            onClick={onNewChat}
            className="flex w-full items-center gap-2 rounded-md bg-foreground px-3 py-2 text-sm text-background transition-colors hover:bg-foreground/90"
          >
            <Plus className="size-4" />
            New Chat
          </button>
        </div>
      )}

      {/* Session list */}
      {!collapsed && (
        <ScrollArea className="flex-1 px-2 py-2">
          {isLoading ? (
            <div className="flex flex-col gap-2 px-1">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <SessionList
              sessions={sessions}
              activeChatId={activeChatId}
              workspaceId={workspaceId}
            />
          )}
        </ScrollArea>
      )}

      <div className="mt-auto border-t p-2">
        <Link href={`/w/${workspaceId}/settings/integrations`}>
          <Button
            variant="ghost"
            size={collapsed ? "icon-sm" : "sm"}
            className={cn(!collapsed && "w-full justify-start gap-2")}
            aria-label="Settings"
          >
            <Settings className="size-4" />
            {!collapsed && "Settings"}
          </Button>
        </Link>
      </div>
    </aside>
  )
}
