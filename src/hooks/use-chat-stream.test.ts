// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChatStream } from './use-chat-stream'

// Configurable query result
let queryResult: { data: Record<string, unknown>[] | null; error: unknown } = {
  data: [],
  error: null,
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => queryResult,
        }),
      }),
    }),
  }),
}))

const mockDbRows = [
  {
    id: 'msg-1',
    chat_session_id: 'session-1',
    role: 'user',
    sender_id: 'user-1',
    status: 'completed',
    parts: [{ type: 'text', text: 'Hello' }],
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'msg-2',
    chat_session_id: 'session-1',
    role: 'assistant',
    workflow_run_id: 'run-1',
    status: 'completed',
    parts: [{ type: 'text', text: 'Hi there' }],
    created_at: '2026-01-01T00:00:01Z',
  },
]

const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock EventSource globally
const MockES = vi.fn().mockImplementation(() => ({
  onmessage: null,
  onerror: null,
  close: vi.fn(),
  addEventListener: vi.fn((_event: string, handler: () => void) => {
    if (_event === 'done') setTimeout(handler, 50)
  }),
}))
Object.defineProperty(globalThis, 'EventSource', {
  value: MockES,
  writable: true,
  configurable: true,
})

describe('useChatStream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: mockDbRows, error: null }
  })

  it('fetches messages on mount', async () => {
    const { result } = renderHook(() => useChatStream('session-1'))

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
    })

    expect(result.current.messages[0].role).toBe('user')
    expect(result.current.messages[1].role).toBe('assistant')
  })

  it('sendMessage POSTs and updates optimistically', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"text","text":"Response"}\n\n'))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    mockFetch.mockResolvedValueOnce({ ok: true, body: stream })

    const { result } = renderHook(() => useChatStream('session-1'))

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
    })

    await act(async () => {
      await result.current.sendMessage('Test message')
    })

    expect(result.current.messages.length).toBeGreaterThanOrEqual(4)

    const userMsg = result.current.messages[2]
    expect(userMsg.role).toBe('user')
    expect(userMsg.parts[0]).toEqual({ type: 'text', text: 'Test message' })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ chatSessionId: 'session-1', content: 'Test message' }),
      })
    )
  })

  it('reconnects when latest message is streaming', async () => {
    queryResult = {
      data: [
        mockDbRows[0],
        {
          ...mockDbRows[1],
          status: 'streaming',
          workflow_run_id: 'run-reconnect',
        },
      ],
      error: null,
    }

    const { result } = renderHook(() => useChatStream('session-1'))

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
    })

    await waitFor(() => {
      expect(MockES).toHaveBeenCalledWith('/api/runs/run-reconnect?startIndex=0')
    })
  })
})
