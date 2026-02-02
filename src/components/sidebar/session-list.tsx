"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { ChatSession } from "@/lib/types"
import { useWorkspace } from "@/app/(app)/w/[workspaceId]/workspace-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface SessionListProps {
  sessions: ChatSession[]
  activeChatId: string | null
  workspaceId: string
  onSessionClick?: () => void
}

function SessionTitle({ title }: { title: string }) {
  const [visible, setVisible] = useState(title)
  const [fading, setFading] = useState(false)
  const prevRef = useRef(title)

  useEffect(() => {
    if (title === prevRef.current) return
    prevRef.current = title
    setFading(true)
    const timer = setTimeout(() => {
      setVisible(title)
      setFading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [title])

  return (
    <span
      className={cn(
        "inline-block transition-opacity duration-200",
        fading ? "opacity-0" : "opacity-100"
      )}
    >
      {visible}
    </span>
  )
}

function SessionItem({
  session,
  isActive,
  workspaceId,
  onSessionClick,
}: {
  session: ChatSession
  isActive: boolean
  workspaceId: string
  onSessionClick?: () => void
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { deleteSession } = useWorkspace()
  const router = useRouter()

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteSession(session.id)
      if (isActive) {
        router.push(`/w/${workspaceId}`)
      }
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <>
      <div className="group relative flex items-center">
        <Link
          href={`/w/${workspaceId}/chat/${session.id}`}
          onClick={onSessionClick}
          className={cn(
            "block w-full truncate rounded-md px-3 py-2 pr-8 text-sm transition-colors",
            isActive
              ? "bg-accent text-accent-foreground font-medium"
              : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
          )}
          aria-current={isActive ? "page" : undefined}
        >
          <SessionTitle title={session.title ?? "New Chat"} />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "absolute right-1 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-accent-foreground focus-visible:opacity-100 group-hover:opacity-100",
                isActive && "text-accent-foreground"
              )}
              onClick={(e) => e.preventDefault()}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setShowDeleteDialog(true)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chat and all its messages. Any
              shared links to this conversation will also stop working. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function SessionList({
  sessions,
  activeChatId,
  workspaceId,
  onSessionClick,
}: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <p className="px-3 py-2 text-sm text-muted-foreground">No chats yet</p>
    )
  }

  return (
    <ul className="flex flex-col gap-0.5" role="list">
      {sessions.map((session, index) => {
        const isActive = session.id === activeChatId
        return (
          <li
            key={session.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <SessionItem
              session={session}
              isActive={isActive}
              workspaceId={workspaceId}
              onSessionClick={onSessionClick}
            />
          </li>
        )
      })}
    </ul>
  )
}
