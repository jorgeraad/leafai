import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUserMessageRow = {
  id: 'msg-1',
  chat_session_id: 'cs-1',
  role: 'user',
  sender_id: 'user-1',
  parts: [{ type: 'text', text: 'Hello' }],
  status: 'completed',
  workflow_run_id: null,
  created_at: '2026-01-01T00:00:00Z',
}

const mockAssistantMessageRow = {
  id: 'msg-2',
  chat_session_id: 'cs-1',
  role: 'assistant',
  sender_id: null,
  parts: [],
  status: 'pending',
  workflow_run_id: 'run-1',
  created_at: '2026-01-01T00:00:01Z',
}

function createQueryMock(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = ['from', 'select', 'insert', 'update', 'eq', 'order', 'single']
  for (const m of methods) {
    chain[m] = vi.fn(() => chain)
  }
  chain.single = vi.fn(() => Promise.resolve(resolvedValue))
  chain.from = vi.fn(() => chain)
  return chain
}

let mockChain: ReturnType<typeof createQueryMock>

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockChain),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createUserMessage', () => {
  it('creates a user message and returns typed result', async () => {
    mockChain = createQueryMock({ data: mockUserMessageRow, error: null })
    const { createUserMessage } = await import('./messages')
    const msg = await createUserMessage('cs-1', 'user-1', 'Hello')
    expect(msg.role).toBe('user')
    expect(msg.senderId).toBe('user-1')
    expect(msg.parts).toEqual([{ type: 'text', text: 'Hello' }])
  })
})

describe('createPendingAssistantMessage', () => {
  it('creates a pending assistant message', async () => {
    mockChain = createQueryMock({ data: mockAssistantMessageRow, error: null })
    vi.resetModules()
    vi.mock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(() => mockChain),
    }))
    const { createPendingAssistantMessage } = await import('./messages')
    const msg = await createPendingAssistantMessage('cs-1', 'run-1')
    expect(msg.role).toBe('assistant')
    expect(msg.status).toBe('pending')
    expect(msg.workflowRunId).toBe('run-1')
  })
})

describe('listMessages', () => {
  it('returns messages ordered by created_at', async () => {
    const listChain: Record<string, unknown> = {}
    const methods = ['from', 'select', 'eq', 'order']
    for (const m of methods) {
      listChain[m] = vi.fn(() => listChain)
    }
    listChain.order = vi.fn(() => Promise.resolve({ data: [mockUserMessageRow, mockAssistantMessageRow], error: null }))
    listChain.from = vi.fn(() => listChain)
    mockChain = listChain as ReturnType<typeof createQueryMock>

    vi.resetModules()
    vi.mock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(() => mockChain),
    }))
    const { listMessages } = await import('./messages')
    const msgs = await listMessages('cs-1')
    expect(msgs).toHaveLength(2)
    expect(msgs[0].role).toBe('user')
    expect(msgs[1].role).toBe('assistant')
  })
})

describe('completeAssistantMessage', () => {
  it('updates message with parts and completed status', async () => {
    const updateChain: Record<string, unknown> = {}
    const methods = ['from', 'update', 'eq']
    for (const m of methods) {
      updateChain[m] = vi.fn(() => updateChain)
    }
    updateChain.eq = vi.fn(() => Promise.resolve({ error: null }))
    updateChain.from = vi.fn(() => updateChain)
    mockChain = updateChain as ReturnType<typeof createQueryMock>

    vi.resetModules()
    vi.mock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(() => mockChain),
    }))
    const { completeAssistantMessage } = await import('./messages')
    await expect(completeAssistantMessage('msg-2', [{ type: 'text', text: 'Response' }])).resolves.toBeUndefined()
  })
})

describe('failAssistantMessage', () => {
  it('updates message status to error', async () => {
    const updateChain: Record<string, unknown> = {}
    const methods = ['from', 'update', 'eq']
    for (const m of methods) {
      updateChain[m] = vi.fn(() => updateChain)
    }
    updateChain.eq = vi.fn(() => Promise.resolve({ error: null }))
    updateChain.from = vi.fn(() => updateChain)
    mockChain = updateChain as ReturnType<typeof createQueryMock>

    vi.resetModules()
    vi.mock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(() => mockChain),
    }))
    const { failAssistantMessage } = await import('./messages')
    await expect(failAssistantMessage('msg-2')).resolves.toBeUndefined()
  })
})
