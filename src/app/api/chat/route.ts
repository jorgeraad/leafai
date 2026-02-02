import { after } from 'next/server'
import { start } from 'workflow/api'
import { chatWorkflow } from './workflow'
import { createClient } from '@/lib/supabase/server'
import {
  getChatSession,
  createUserMessage,
  createPendingAssistantMessage,
  updateChatSessionTitle,
  listMessages,
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

  const needsTitle = !session.title

  const run = await start(chatWorkflow, [
    chatSessionId,
    user.id,
    workspaceId,
  ])

  await createPendingAssistantMessage(chatSessionId, run.runId)

  // Generate title after the workflow completes so the full conversation is available
  if (needsTitle) {
    after(async () => {
      try {
        // Wait for the workflow to finish so the assistant reply is in the DB
        await run.returnValue
        const allMessages = await listMessages(chatSessionId)
        const titleMessages = allMessages
          .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.status === 'completed'))
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.parts
              .filter((p) => p.type === 'text')
              .map((p) => p.text)
              .join(''),
          }))
          .filter((m) => m.content)
        const title = await generateTitle(titleMessages.length ? titleMessages : [{ role: 'user', content }])
        if (title) {
          await updateChatSessionTitle(chatSessionId, title)
        }
      } catch {
        // title generation is best-effort
      }
    })
  }

  // run.readable emits deserialized JS objects (via devalue).
  // Transform them into SSE-formatted text for the client.
  const encoder = new TextEncoder()
  const workflowReader = (run.readable as ReadableStream).getReader()
  let receivedError = false
  const sseStream = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await workflowReader.read()
        if (done) {
          // The error chunk written in the workflow's catch block may not propagate
          // through the framework's stream plumbing. Fall back to checking the
          // workflow's return value — it returns { messageId: '' } on error.
          if (!receivedError) {
            try {
              const result = await run.returnValue
              if (result && result.messageId === '') {
                const errLine = `data: ${JSON.stringify({ type: 'error', message: 'An error occurred while generating a response' })}\n\n`
                controller.enqueue(encoder.encode(errLine))
              }
            } catch {
              // Workflow itself failed (threw instead of returning)
              const errLine = `data: ${JSON.stringify({ type: 'error', message: 'Workflow failed' })}\n\n`
              controller.enqueue(encoder.encode(errLine))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
          return
        }
        if (value && typeof value === 'object' && value.type === 'error') {
          receivedError = true
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
