import { start } from 'workflow/api'
import { chatWorkflow } from './workflow'
import { createClient } from '@/lib/supabase/server'
import {
  getChatSession,
  createUserMessage,
  createPendingAssistantMessage,
} from '@/lib/db'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { chatSessionId, content } = await req.json()

  const session = await getChatSession(chatSessionId)
  if (!session) {
    return new Response('Chat session not found', { status: 404 })
  }

  const workspaceId = session.workspaceId

  await createUserMessage(chatSessionId, user.id, content)

  const run = await start(chatWorkflow, [
    chatSessionId,
    user.id,
    workspaceId,
  ])

  await createPendingAssistantMessage(chatSessionId, run.runId)

  return new Response(run.readable, {
    headers: { 'Content-Type': 'text/event-stream' },
  })
}
