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

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-background transition-[width] duration-200 animate-fade-in",
        collapsed ? "w-12" : "w-64"
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b p-2">
        <Button
          variant="ghost"
          size={collapsed ? "icon-sm" : "sm"}
          className={cn(!collapsed && "justify-start gap-2")}
          onClick={onNewChat}
          aria-label="New chat"
        >
          <LeafLogo className="size-4 text-green-600" />
          {!collapsed && <span className="font-semibold">Leaf</span>}
        </Button>
        {!collapsed && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onNewChat}
              aria-label="New chat"
            >
              <Plus className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCollapsed((c) => !c)}
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          </>
        )}
        {collapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Expand sidebar"
          >
            <PanelLeft className="size-4" />
          </Button>
        )}
      </div>

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
