import { getWritable } from 'workflow'
import {
  listMessages,
  getIntegration,
  completeAssistantMessage,
  failAssistantMessage,
} from '@/lib/db'
import { getDriveClient } from '@/lib/google'
import { runAgent, createDriveTools } from '@/lib/ai'
import type { Message, MessagePart, AssistantMessage } from '@/lib/types'

interface AgentStepResult {
  id: string
  parts: MessagePart[]
  error?: undefined
}

interface AgentStepError {
  error: string
  id?: undefined
  parts?: undefined
}

export async function chatWorkflow(
  chatSessionId: string,
  userId: string,
  workspaceId: string,
): Promise<{ messageId: string }> {
  'use workflow'

  const { history, assistantMessageId } = await loadHistory(chatSessionId)
  const refreshToken = await getRefreshToken(userId, workspaceId)

  const result = await runAgentStep(history, refreshToken)

  if ('error' in result) {
    if (assistantMessageId) {
      await failAssistant(assistantMessageId)
    }
    return { messageId: '' }
  }

  if (assistantMessageId) {
    await saveResponse(assistantMessageId, result.parts)
  }

  return { messageId: result.id }
}

async function loadHistory(chatSessionId: string) {
  'use step'
  const messages = await listMessages(chatSessionId)

  // Find the pending assistant message (created by the route handler)
  const assistantMsg = messages.find(
    (m: Message): m is AssistantMessage =>
      m.role === 'assistant' && m.status === 'pending',
  )

  // Convert to format expected by runAgent
  const history = messages
    .filter((m: Message) => m.status === 'completed')
    .map((msg: Message) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.parts
        .filter((p: MessagePart) => p.type === 'text')
        .map((p) => (p as { type: 'text'; text: string }).text)
        .join(''),
    }))

  return { history, assistantMessageId: assistantMsg?.id ?? null }
}

async function getRefreshToken(userId: string, workspaceId: string): Promise<string | null> {
  'use step'
  const integration = await getIntegration(userId, workspaceId, 'google_drive')
  if (!integration) return null
  return integration.refreshToken
}

async function runAgentStep(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  refreshToken: string | null,
): Promise<AgentStepResult | AgentStepError> {
  'use step'
  const writable = getWritable()
  const writer = writable.getWriter()

  // Build tools inside this step to avoid serializing Zod schemas across step boundaries
  const tools = refreshToken
    ? createDriveTools(getDriveClient(refreshToken))
    : {}

  try {
    const result = await runAgent({
      messages: history,
      tools,
      writer,
    })
    await writer.close()
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await writer.write({ type: 'error', message })
    await writer.close()
    return { error: message }
  }
}

async function saveResponse(assistantMessageId: string, parts: MessagePart[]) {
  'use step'
  await completeAssistantMessage(assistantMessageId, parts)
}

async function failAssistant(assistantMessageId: string) {
  'use step'
  await failAssistantMessage(assistantMessageId)
}
