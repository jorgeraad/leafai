import { streamText, generateId, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import type { ModelMessage } from 'ai'
import type { AgentResult, MessagePart } from '@/lib/types'
import { buildSystemPrompt } from './prompts'

export interface RunAgentParams {
  messages: ModelMessage[]
  tools: Record<string, unknown>
  context?: string
  maxSteps?: number
  onChunk?: (chunk: { type: string; text?: string }) => void
}

export async function runAgent(params: RunAgentParams): Promise<AgentResult> {
  const {
    messages,
    tools,
    context,
    maxSteps = 10,
    onChunk,
  } = params

  const parts: MessagePart[] = []

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: buildSystemPrompt(context),
    messages,
    tools: tools as Parameters<typeof streamText>[0]['tools'],
    stopWhen: stepCountIs(maxSteps),
    onChunk: onChunk
      ? ({ chunk }) => {
          onChunk(chunk)
        }
      : undefined,
  })

  for await (const part of result.fullStream) {
    if (part.type === 'text-delta') {
      const last = parts[parts.length - 1]
      if (last && last.type === 'text') {
        last.text += part.text
      } else {
        parts.push({ type: 'text', text: part.text })
      }
    } else if (part.type === 'tool-call') {
      parts.push({
        type: 'tool-call',
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        args: part.input as Record<string, unknown>,
      })
    } else if (part.type === 'tool-result') {
      parts.push({
        type: 'tool-result',
        toolCallId: part.toolCallId,
        result: part.output,
      })
    }
  }

  return {
    id: generateId(),
    parts,
  }
}
