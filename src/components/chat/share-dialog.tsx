"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ShareState {
  shareToken: string
  sharedAt: string
}

interface ShareDialogProps {
  chatSessionId: string
  sessionUpdatedAt: Date
}

export function ShareDialog({ chatSessionId, sessionUpdatedAt }: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [share, setShare] = useState<ShareState | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [fetched, setFetched] = useState(false)

  const isStale = share
    ? sessionUpdatedAt > new Date(share.sharedAt)
    : false

  // Fetch existing share state when dialog opens
  useEffect(() => {
    if (!open || fetched) return
    setFetched(true)
    fetch(`/api/share?chatSessionId=${chatSessionId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.shareToken) setShare(data)
      })
      .catch(() => {})
  }, [open, fetched, chatSessionId])

  const shareUrl = share
    ? `${window.location.origin}/shared/${share.shareToken}`
    : null

  const handleShare = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatSessionId }),
      })
      if (!res.ok) throw new Error("Failed to share")
      const data = await res.json()
      setShare(data)
    } finally {
      setLoading(false)
    }
  }, [chatSessionId])

  const handleRevoke = useCallback(async () => {
    setLoading(true)
    try {
      await fetch("/api/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatSessionId }),
      })
      setShare(null)
    } finally {
      setLoading(false)
    }
  }, [chatSessionId])

  const handleCopy = useCallback(() => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [shareUrl])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" title="Share chat">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" x2="12" y1="2" y2="15" />
          </svg>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm overflow-hidden">
        <DialogHeader>
          <DialogTitle>Share chat</DialogTitle>
          <DialogDescription>
            Generate a public link anyone can use to view this conversation.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {!share ? (
            <Button onClick={handleShare} disabled={loading}>
              {loading ? "Generating…" : "Create public link"}
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <a
                  href={shareUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded-md border bg-muted px-3 py-2 text-sm hover:bg-accent transition-colors cursor-pointer"
                >
                  <span className="truncate">{shareUrl}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" x2="21" y1="14" y2="3" />
                  </svg>
                </a>
                <Button variant="outline" size="icon-sm" className="shrink-0" onClick={handleCopy} title={copied ? "Copied!" : "Copy link"}>
                  {copied ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  )}
                </Button>
              </div>
              {isStale && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  This chat has been updated since the link was last generated.
                  <Button
                    variant="link"
                    size="sm"
                    className="ml-1 h-auto p-0 text-amber-800 underline"
                    onClick={handleShare}
                    disabled={loading}
                  >
                    {loading ? "Updating…" : "Update link"}
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevoke}
                disabled={loading}
              >
                {loading ? "Removing…" : "Stop sharing"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
