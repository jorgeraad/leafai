import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock data
const mockWorkspaceRow = {
  id: 'ws-1',
  name: "Test's Workspace",
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

// Build a chainable mock for Supabase query builder
function createQueryMock(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = ['from', 'select', 'insert', 'eq', 'limit', 'single', 'order']
  for (const m of methods) {
    chain[m] = vi.fn(() => chain)
  }
  // single() resolves the chain
  chain.single = vi.fn(() => Promise.resolve(resolvedValue))
  chain.from = vi.fn(() => chain)
  return chain
}

let mockChain: ReturnType<typeof createQueryMock>

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockChain),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getWorkspaceForUser', () => {
  it('returns null when no workspace found', async () => {
    mockChain = createQueryMock({ data: null, error: { code: 'PGRST116', message: 'not found' } })
    const { getWorkspaceForUser } = await import('./workspaces')
    const result = await getWorkspaceForUser('user-1')
    expect(result).toBeNull()
  })

  it('returns workspace when found', async () => {
    mockChain = createQueryMock({ data: { workspaces: mockWorkspaceRow }, error: null })
    // Need fresh import to pick up new mock
    vi.resetModules()
    vi.mock('@/lib/supabase/server', () => ({
      createClient: vi.fn(async () => mockChain),
    }))
    const { getWorkspaceForUser } = await import('./workspaces')
    const result = await getWorkspaceForUser('user-1')
    expect(result).toEqual({
      id: 'ws-1',
      name: "Test's Workspace",
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    })
  })
})

describe('getOrCreateWorkspace', () => {
  it('returns existing workspace if user already has one', async () => {
    // Mock that returns workspace on the select (getWorkspaceForUser path)
    mockChain = createQueryMock({ data: { workspaces: mockWorkspaceRow }, error: null })
    vi.resetModules()
    vi.mock('@/lib/supabase/server', () => ({
      createClient: vi.fn(async () => mockChain),
    }))
    const { getOrCreateWorkspace } = await import('./workspaces')
    const result = await getOrCreateWorkspace('user-1', 'Test')
    expect(result.id).toBe('ws-1')
  })
})
