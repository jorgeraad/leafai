import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockListMessages = vi.fn()
const mockGetIntegration = vi.fn()
const mockMarkMessageStreaming = vi.fn()
const mockCompleteAssistantMessage = vi.fn()
const mockFailAssistantMessage = vi.fn()

vi.mock('@/lib/db', () => ({
  listMessages: (...args: unknown[]) => mockListMessages(...args),
  getIntegration: (...args: unknown[]) => mockGetIntegration(...args),
  markMessageStreaming: (...args: unknown[]) => mockMarkMessageStreaming(...args),
  completeAssistantMessage: (...args: unknown[]) => mockCompleteAssistantMessage(...args),
  failAssistantMessage: (...args: unknown[]) => mockFailAssistantMessage(...args),
}))

const mockGetDriveClient = vi.fn()

vi.mock('@/lib/google', () => ({
  getDriveClient: (...args: unknown[]) => mockGetDriveClient(...args),
}))

const mockRunAgent = vi.fn()
const mockCreateDriveTools = vi.fn()

vi.mock('@/lib/ai', () => ({
  runAgent: (...args: unknown[]) => mockRunAgent(...args),
  createDriveTools: (...args: unknown[]) => mockCreateDriveTools(...args),
}))

// Mock workflow's getWritable
const mockWrite = vi.fn()
const mockReleaseLock = vi.fn()
const mockClose = vi.fn()
const mockGetWriter = vi.fn(() => ({ write: mockWrite, releaseLock: mockReleaseLock, close: mockClose }))

vi.mock('workflow', () => ({
  getWritable: vi.fn(() => ({ getWriter: mockGetWriter })),
}))

describe('chatWorkflow logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads history, builds tools with integration, runs agent, saves response', async () => {
    mockListMessages.mockResolvedValue([
      {
        id: 'msg1',
        role: 'user',
        chatSessionId: 's1',
        senderId: 'u1',
        parts: [{ type: 'text', text: 'hello' }],
        status: 'completed',
        createdAt: new Date(),
      },
      {
        id: 'ast1',
        role: 'assistant',
        chatSessionId: 's1',
        workflowRunId: 'run-1',
        parts: [],
        status: 'pending',
        createdAt: new Date(),
      },
    ])

    const mockDrive = { files: {} }
    mockGetIntegration.mockResolvedValue({
      id: 'int1',
      refreshToken: 'token-123',
    })
    mockGetDriveClient.mockReturnValue(mockDrive)

    const mockTools = { list_drive_folder: {} }
    mockCreateDriveTools.mockReturnValue(mockTools)

    mockRunAgent.mockResolvedValue({
      id: 'result-1',
      parts: [{ type: 'text', text: 'Hi there!' }],
    })

    const { chatWorkflow } = await import('./workflow')
    const result = await chatWorkflow('s1', 'u1', 'ws1')

    expect(mockListMessages).toHaveBeenCalledWith('s1')
    expect(mockGetIntegration).toHaveBeenCalledWith('u1', 'ws1', 'google_drive')
    expect(mockGetDriveClient).toHaveBeenCalledWith('token-123')
    expect(mockCreateDriveTools).toHaveBeenCalledWith(mockDrive)
    expect(mockRunAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: 'user', content: 'hello' }],
        tools: mockTools,
      }),
    )
    expect(mockCompleteAssistantMessage).toHaveBeenCalledWith('ast1', [
      { type: 'text', text: 'Hi there!' },
    ])
    expect(result).toEqual({ messageId: 'result-1' })
  })

  it('runs agent with empty tools when no Drive integration', async () => {
    mockListMessages.mockResolvedValue([
      {
        id: 'msg1',
        role: 'user',
        chatSessionId: 's1',
        senderId: 'u1',
        parts: [{ type: 'text', text: 'hello' }],
        status: 'completed',
        createdAt: new Date(),
      },
      {
        id: 'ast1',
        role: 'assistant',
        chatSessionId: 's1',
        workflowRunId: 'run-1',
        parts: [],
        status: 'pending',
        createdAt: new Date(),
      },
    ])

    mockGetIntegration.mockResolvedValue(null)
    mockRunAgent.mockResolvedValue({
      id: 'result-2',
      parts: [{ type: 'text', text: 'No Drive access.' }],
    })

    const { chatWorkflow } = await import('./workflow')
    await chatWorkflow('s1', 'u1', 'ws1')

    expect(mockGetDriveClient).not.toHaveBeenCalled()
    expect(mockCreateDriveTools).not.toHaveBeenCalled()
    expect(mockRunAgent).toHaveBeenCalledWith(
      expect.objectContaining({ tools: {} }),
    )
  })

  it('calls failAssistantMessage on agent error and returns empty messageId', async () => {
    mockListMessages.mockResolvedValue([
      {
        id: 'msg1',
        role: 'user',
        chatSessionId: 's1',
        senderId: 'u1',
        parts: [{ type: 'text', text: 'hello' }],
        status: 'completed',
        createdAt: new Date(),
      },
      {
        id: 'ast1',
        role: 'assistant',
        chatSessionId: 's1',
        workflowRunId: 'run-1',
        parts: [],
        status: 'pending',
        createdAt: new Date(),
      },
    ])

    mockGetIntegration.mockResolvedValue(null)
    mockRunAgent.mockRejectedValue(new Error('LLM error'))

    const { chatWorkflow } = await import('./workflow')

    // The workflow catches the error internally and returns { messageId: '' }
    const result = await chatWorkflow('s1', 'u1', 'ws1')
    expect(result).toEqual({ messageId: '' })
    expect(mockFailAssistantMessage).toHaveBeenCalledWith('ast1')
  })
})
