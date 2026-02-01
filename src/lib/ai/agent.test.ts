import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildSystemPrompt } from './prompts'
import { createDriveTools } from './tools'

// Mock the ai module
vi.mock('ai', () => {
  const stepCountIs = vi.fn((n: number) => ({ type: 'stepCount', count: n }))
  const generateId = vi.fn(() => 'mock-id-12345678')
  const tool = vi.fn((def: Record<string, unknown>) => def)

  // streamText returns an async iterable fullStream
  const streamText = vi.fn()

  return { streamText, generateId, stepCountIs, tool }
})

vi.mock('@openrouter/ai-sdk-provider', () => ({
  openrouter: vi.fn((model: string) => ({ modelId: model })),
}))

function createMockDrive() {
  return {
    files: {
      list: vi.fn().mockResolvedValue({ data: { files: [{ id: '1', name: 'test.txt' }] } }),
      get: vi.fn().mockResolvedValue({ data: 'file content' }),
      export: vi.fn().mockResolvedValue({ data: 'exported content' }),
    },
  } as unknown as import('googleapis').drive_v3.Drive
}

describe('buildSystemPrompt', () => {
  it('returns base prompt without context', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('You are Leaf')
    expect(prompt).not.toContain('document context')
  })

  it('returns prompt with context section when context provided', () => {
    const prompt = buildSystemPrompt('Some document content')
    expect(prompt).toContain('You are Leaf')
    expect(prompt).toContain('Some document content')
    expect(prompt).toContain('document context')
  })
})

describe('createDriveTools', () => {
  let drive: ReturnType<typeof createMockDrive>

  beforeEach(() => {
    drive = createMockDrive()
  })

  it('returns tools with correct keys', () => {
    const tools = createDriveTools(drive)
    expect(Object.keys(tools)).toEqual(['list_drive_folder', 'read_drive_file', 'search_drive'])
  })

  it('each tool has a valid zod schema', () => {
    const tools = createDriveTools(drive)

    // list_drive_folder
    const listSchema = tools.list_drive_folder.inputSchema
    expect(listSchema.parse({ folder_id: 'abc' })).toEqual({ folder_id: 'abc' })

    // read_drive_file
    const readSchema = tools.read_drive_file.inputSchema
    expect(
      readSchema.parse({ file_id: 'f1', file_name: 'test.txt', mime_type: 'text/plain' }),
    ).toEqual({ file_id: 'f1', file_name: 'test.txt', mime_type: 'text/plain' })

    // search_drive
    const searchSchema = tools.search_drive.inputSchema
    expect(searchSchema.parse({ query: 'hello' })).toEqual({ query: 'hello' })
  })

  it('list_drive_folder calls drive.files.list with correct query', async () => {
    const tools = createDriveTools(drive)
    await tools.list_drive_folder.execute!({ folder_id: 'folder123' }, { toolCallId: '', messages: [], abortSignal: undefined as unknown as AbortSignal })
    expect(drive.files.list).toHaveBeenCalledWith({
      q: "'folder123' in parents and trashed = false",
      fields: 'files(id, name, mimeType, modifiedTime)',
    })
  })

  it('read_drive_file calls drive.files.export for Google Docs types', async () => {
    const tools = createDriveTools(drive)
    await tools.read_drive_file.execute!(
      { file_id: 'f1', file_name: 'doc.gdoc', mime_type: 'application/vnd.google-apps.document' },
      { toolCallId: '', messages: [], abortSignal: undefined as unknown as AbortSignal },
    )
    expect(drive.files.export).toHaveBeenCalledWith({
      fileId: 'f1',
      mimeType: 'text/plain',
    })
  })

  it('read_drive_file calls drive.files.get for non-Google types', async () => {
    const tools = createDriveTools(drive)
    await tools.read_drive_file.execute!(
      { file_id: 'f1', file_name: 'file.txt', mime_type: 'text/plain' },
      { toolCallId: '', messages: [], abortSignal: undefined as unknown as AbortSignal },
    )
    expect(drive.files.get).toHaveBeenCalledWith(
      { fileId: 'f1', alt: 'media' },
      { responseType: 'text' },
    )
  })

  it('search_drive calls drive.files.list with fullText query', async () => {
    const tools = createDriveTools(drive)
    await tools.search_drive.execute!({ query: 'budget' }, { toolCallId: '', messages: [], abortSignal: undefined as unknown as AbortSignal })
    expect(drive.files.list).toHaveBeenCalledWith({
      q: "fullText contains 'budget' and trashed = false",
      fields: 'files(id, name, mimeType, modifiedTime, parents)',
      pageSize: 10,
    })
  })
})

describe('runAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls streamText with correct params and returns AgentResult', async () => {
    const { streamText, stepCountIs } = await import('ai')
    const mockedStreamText = vi.mocked(streamText)

    // Create an async iterable that emits text deltas
    async function* mockFullStream() {
      yield { type: 'text-delta' as const, text: 'Hello ' }
      yield { type: 'text-delta' as const, text: 'world' }
    }

    mockedStreamText.mockReturnValue({
      fullStream: mockFullStream(),
    } as ReturnType<typeof streamText>)

    // Import fresh to use the mocked modules
    const { runAgent } = await import('./agent')

    const chunks: unknown[] = []
    const result = await runAgent({
      messages: [{ role: 'user', content: 'hello' }],
      tools: {},
      onChunk: (chunk) => chunks.push(chunk),
    })

    expect(mockedStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('You are Leaf'),
        messages: [{ role: 'user', content: 'hello' }],
        tools: {},
        stopWhen: stepCountIs(10),
      }),
    )

    expect(result.id).toBe('mock-id-12345678')
    expect(result.parts).toEqual([{ type: 'text', text: 'Hello world' }])
  })

  it('collects tool-call and tool-result parts', async () => {
    const { streamText } = await import('ai')
    const mockedStreamText = vi.mocked(streamText)

    async function* mockFullStream() {
      yield { type: 'text-delta' as const, text: 'Let me check.' }
      yield {
        type: 'tool-call' as const,
        toolCallId: 'call-1',
        toolName: 'search_drive',
        input: { query: 'budget' },
      }
      yield {
        type: 'tool-result' as const,
        toolCallId: 'call-1',
        output: [{ id: '1', name: 'Budget.xlsx' }],
      }
      yield { type: 'text-delta' as const, text: 'Found it.' }
    }

    mockedStreamText.mockReturnValue({
      fullStream: mockFullStream(),
    } as ReturnType<typeof streamText>)

    const { runAgent } = await import('./agent')

    const result = await runAgent({
      messages: [{ role: 'user', content: 'find budget' }],
      tools: {},
    })

    expect(result.parts).toEqual([
      { type: 'text', text: 'Let me check.' },
      { type: 'tool-call', toolCallId: 'call-1', toolName: 'search_drive', args: { query: 'budget' } },
      { type: 'tool-result', toolCallId: 'call-1', result: [{ id: '1', name: 'Budget.xlsx' }] },
      { type: 'text', text: 'Found it.' },
    ])
  })

  it('respects maxSteps parameter', async () => {
    const { streamText, stepCountIs } = await import('ai')
    const mockedStreamText = vi.mocked(streamText)

    async function* mockFullStream() {
      yield { type: 'text-delta' as const, text: 'ok' }
    }

    mockedStreamText.mockReturnValue({
      fullStream: mockFullStream(),
    } as ReturnType<typeof streamText>)

    const { runAgent } = await import('./agent')

    await runAgent({
      messages: [{ role: 'user', content: 'hi' }],
      tools: {},
      maxSteps: 3,
    })

    expect(mockedStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        stopWhen: stepCountIs(3),
      }),
    )
  })

  it('passes context to buildSystemPrompt', async () => {
    const { streamText } = await import('ai')
    const mockedStreamText = vi.mocked(streamText)

    async function* mockFullStream() {
      yield { type: 'text-delta' as const, text: 'ok' }
    }

    mockedStreamText.mockReturnValue({
      fullStream: mockFullStream(),
    } as ReturnType<typeof streamText>)

    const { runAgent } = await import('./agent')

    await runAgent({
      messages: [{ role: 'user', content: 'hi' }],
      tools: {},
      context: 'Document: revenue up 15%',
    })

    expect(mockedStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('revenue up 15%'),
      }),
    )
  })
})
