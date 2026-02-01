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

export async function chatWorkflow(
  chatSessionId: string,
  userId: string,
  workspaceId: string,
): Promise<{ messageId: string }> {
  'use workflow'

  const { history, assistantMessageId } = await loadHistory(chatSessionId)
  const tools = await buildTools(userId, workspaceId)

  let result
  try {
    result = await runAgentStep(history, tools)
  } catch (error) {
    if (assistantMessageId) {
      await failAssistant(assistantMessageId)
    }
    throw error
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

async function buildTools(userId: string, workspaceId: string) {
  'use step'
  const integration = await getIntegration(userId, workspaceId, 'google_drive')
  if (!integration) return {}
  const drive = getDriveClient(integration.refreshToken)
  return createDriveTools(drive)
}

async function runAgentStep(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  tools: Record<string, unknown>,
) {
  'use step'
  const writable = getWritable()
  const writer = writable.getWriter()

  try {
    const result = await runAgent({
      messages: history,
      tools,
      onChunk: (chunk) => {
        writer.write(chunk)
      },
    })
    return result
  } finally {
    writer.releaseLock()
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
