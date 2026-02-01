import { generateText } from 'ai'
import { openrouter } from '@openrouter/ai-sdk-provider'

const TITLE_PROMPT = `Generate a concise title (2-5 words) for a chat conversation that starts with the following message. Return ONLY the title, nothing else. No quotes, no punctuation at the end, no explanation.`

export function validateTitle(title: string): string | null {
  const trimmed = title.trim().replace(/[."]+$/, '').trim()
  if (!trimmed) return null
  const words = trimmed.split(/\s+/)
  if (words.length > 6) return null
  if (trimmed.length > 60) return null
  return trimmed
}

export async function generateTitle(messageContent: string): Promise<string> {
  const { text } = await generateText({
    model: openrouter('anthropic/claude-sonnet-4-20250514'),
    system: TITLE_PROMPT,
    messages: [{ role: 'user', content: messageContent }],
    maxOutputTokens: 30,
  })

  const validated = validateTitle(text)
  if (validated) return validated

  // Fallback: take first few words of the message
  const words = messageContent.split(/\s+/).slice(0, 4).join(' ')
  const fallback = words.length > 60 ? words.slice(0, 57) + '...' : words
  return fallback || 'New Chat'
}
