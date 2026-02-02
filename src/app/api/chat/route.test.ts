import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}))

const mockGetChatSession = vi.fn()
const mockCreateUserMessage = vi.fn()
const mockCreatePendingAssistantMessage = vi.fn()

vi.mock('@/lib/db', () => ({
  getChatSession: (...args: unknown[]) => mockGetChatSession(...args),
  createUserMessage: (...args: unknown[]) => mockCreateUserMessage(...args),
  createPendingAssistantMessage: (...args: unknown[]) => mockCreatePendingAssistantMessage(...args),
}))

const mockStart = vi.fn()

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    after: vi.fn((fn: () => void) => { /* no-op in tests */ }),
  }
})

vi.mock('workflow/api', () => ({
  start: (...args: unknown[]) => mockStart(...args),
}))

vi.mock('./workflow', () => ({
  chatWorkflow: vi.fn(),
}))

const { POST } = await import('./route')

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } })

    const res = await POST(makeRequest({ chatSessionId: 's1', content: 'hi' }))
    expect(res.status).toBe(401)
  })

  it('returns 404 when chat session not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockGetChatSession.mockResolvedValue(null)

    const res = await POST(makeRequest({ chatSessionId: 'bad-id', content: 'hi' }))
    expect(res.status).toBe(404)
  })

  it('saves user message, starts workflow, returns SSE stream', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockGetChatSession.mockResolvedValue({ id: 's1', workspaceId: 'ws1' })
    mockCreateUserMessage.mockResolvedValue({
      id: 'msg1',
      role: 'user',
      chatSessionId: 's1',
      senderId: 'u1',
      parts: [{ type: 'text', text: 'hello' }],
      status: 'completed',
      createdAt: new Date(),
    })

    const mockReadable = new ReadableStream()
    mockStart.mockResolvedValue({ runId: 'run-123', readable: mockReadable, returnValue: Promise.resolve({ messageId: 'ast1' }) })
    mockCreatePendingAssistantMessage.mockResolvedValue({
      id: 'ast1',
      role: 'assistant',
      chatSessionId: 's1',
      workflowRunId: 'run-123',
      status: 'pending',
      parts: [],
      createdAt: new Date(),
    })

    const res = await POST(makeRequest({ chatSessionId: 's1', content: 'hello' }))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    expect(mockCreateUserMessage).toHaveBeenCalledWith('s1', 'u1', 'hello')
    expect(mockStart).toHaveBeenCalled()
    expect(mockCreatePendingAssistantMessage).toHaveBeenCalledWith('s1', 'run-123')
  })
})
