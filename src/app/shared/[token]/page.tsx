import { notFound } from "next/navigation"
import { getSharedSession } from "@/lib/db/sharing"
import { LeafLogo } from "@/components/icons/leaf-logo"
import { createClient } from "@/lib/supabase/server"
import { MessageList } from "@/components/chat"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function SharedChatPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const result = await getSharedSession(token)

  if (!result) notFound()

  const { session, messages } = result

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <>
      <div className="flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-accent/50 transition-colors">
            <LeafLogo className="size-4 text-green-600" />
            <span className="font-semibold">Leaf</span>
          </Link>
          <span className="font-semibold">{session.title ?? "Shared Chat"}</span>
        </div>
        {!user && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <MessageList messages={messages} isStreaming={false} className="h-full" contentClassName="mx-auto max-w-4xl px-8 sm:px-12 md:px-16" />
      </div>
    </>
  )
}
