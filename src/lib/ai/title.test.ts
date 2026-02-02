import { describe, it, expect, vi } from 'vitest'
import { validateTitle, generateTitle } from './title'

describe('validateTitle', () => {
  it('returns trimmed title for valid input', () => {
    expect(validateTitle('Project Setup Help')).toBe('Project Setup Help')
  })

  it('strips trailing punctuation', () => {
    expect(validateTitle('Project Setup.')).toBe('Project Setup')
    expect(validateTitle('Project Setup"')).toBe('Project Setup')
  })

  it('returns null for empty string', () => {
    expect(validateTitle('')).toBeNull()
    expect(validateTitle('   ')).toBeNull()
  })

  it('returns null for titles with more than 6 words', () => {
    expect(validateTitle('This is a title with seven words')).toBeNull()
  })

  it('returns null for titles longer than 60 characters', () => {
    const long = 'A'.repeat(61)
    expect(validateTitle(long)).toBeNull()
  })

  it('accepts titles with exactly 6 words', () => {
    expect(validateTitle('One Two Three Four Five Six')).toBe('One Two Three Four Five Six')
  })

  it('accepts titles with exactly 60 characters', () => {
    const title = 'A'.repeat(60)
    expect(validateTitle(title)).toBe(title)
  })
})

vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

vi.mock('@openrouter/ai-sdk-provider', () => ({
  openrouter: vi.fn(() => 'mock-model'),
}))

describe('generateTitle', () => {
  it('returns validated LLM-generated title', async () => {
    const { generateText } = await import('ai')
    vi.mocked(generateText).mockResolvedValue({ text: 'Drive File Analysis' } as never)

    const title = await generateTitle([{ role: 'user', content: 'Can you help me analyze my Google Drive files?' }])
    expect(title).toBe('Drive File Analysis')
  })

  it('returns null when LLM returns invalid title', async () => {
    const { generateText } = await import('ai')
    vi.mocked(generateText).mockResolvedValue({ text: 'This is way too long of a title with many many words' } as never)

    const title = await generateTitle([{ role: 'user', content: 'Help me with something' }])
    expect(title).toBeNull()
  })

  it('returns null for empty LLM response', async () => {
    const { generateText } = await import('ai')
    vi.mocked(generateText).mockResolvedValue({ text: '' } as never)

    const title = await generateTitle([{ role: 'user', content: '' }])
    expect(title).toBeNull()
  })
})
