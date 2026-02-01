import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetReadable = vi.fn()
const mockGetRun = vi.fn()

vi.mock('workflow/api', () => ({
  getRun: (...args: unknown[]) => mockGetRun(...args),
}))

const { GET } = await import('./route')

describe('GET /api/runs/:runId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a readable stream', async () => {
    const mockStream = new ReadableStream()
    mockGetReadable.mockReturnValue(mockStream)
    mockGetRun.mockReturnValue({ getReadable: mockGetReadable })

    const req = new Request('http://localhost:3000/api/runs/run-123')
    const res = await GET(req, { params: Promise.resolve({ runId: 'run-123' }) })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    expect(mockGetRun).toHaveBeenCalledWith('run-123')
    expect(mockGetReadable).toHaveBeenCalledWith({ startIndex: 0 })
  })

  it('passes startIndex query param to getReadable', async () => {
    const mockStream = new ReadableStream()
    mockGetReadable.mockReturnValue(mockStream)
    mockGetRun.mockReturnValue({ getReadable: mockGetReadable })

    const req = new Request('http://localhost:3000/api/runs/run-456?startIndex=5')
    const res = await GET(req, { params: Promise.resolve({ runId: 'run-456' }) })

    expect(mockGetRun).toHaveBeenCalledWith('run-456')
    expect(mockGetReadable).toHaveBeenCalledWith({ startIndex: 5 })
  })
})
