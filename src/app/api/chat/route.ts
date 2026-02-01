import { start } from 'workflow/api'
import { chatWorkflow } from './workflow'
import { createClient } from '@/lib/supabase/server'
import {
  getChatSession,
  createUserMessage,
  createPendingAssistantMessage,
  updateChatSessionTitle,
} from '@/lib/db'
import { generateTitle } from '@/lib/ai'

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

  // Fire-and-forget: generate title if session doesn't have one
  if (!session.title) {
    generateTitle(content)
      .then((title) => updateChatSessionTitle(chatSessionId, title))
      .catch(() => {/* title generation is best-effort */})
  }

  const run = await start(chatWorkflow, [
    chatSessionId,
    user.id,
    workspaceId,
  ])

  await createPendingAssistantMessage(chatSessionId, run.runId)

  // run.readable emits deserialized JS objects (via devalue).
  // Transform them into SSE-formatted text for the client.
  const encoder = new TextEncoder()
  const workflowReader = (run.readable as ReadableStream).getReader()
  const sseStream = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await workflowReader.read()
        if (done) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
          return
        }
        const line = `data: ${JSON.stringify(value)}\n\n`
        controller.enqueue(encoder.encode(line))
      } catch {
        const errLine = `data: ${JSON.stringify({ type: 'error', message: 'Stream terminated unexpectedly' })}\n\n`
        controller.enqueue(encoder.encode(errLine))
        controller.close()
      }
    },
  })

  return new Response(sseStream, {
    headers: { 'Content-Type': 'text/event-stream' },
  })
}
