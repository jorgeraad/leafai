import { describe, it, expect, vi, beforeEach } from 'vitest'

const MOCK_ENCRYPTED = 'encrypted-token-base64'
const MOCK_DECRYPTED = 'refresh-token-plaintext'

vi.mock('@/lib/crypto', () => ({
  encrypt: vi.fn(() => MOCK_ENCRYPTED),
  decrypt: vi.fn(() => MOCK_DECRYPTED),
}))

const mockIntegrationRow = {
  id: 'int-1',
  user_id: 'user-1',
  workspace_id: 'ws-1',
  provider: 'google_drive',
  status: 'active',
  provider_account_email: 'test@example.com',
  encrypted_refresh_token: MOCK_ENCRYPTED,
}

function createQueryMock(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = ['from', 'select', 'insert', 'upsert', 'update', 'delete', 'eq', 'single']
  for (const m of methods) {
    chain[m] = vi.fn(() => chain)
  }
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

describe('getIntegration', () => {
  it('returns null when not found', async () => {
    mockChain = createQueryMock({ data: null, error: { code: 'PGRST116' } })
    const { getIntegration } = await import('./integrations')
    const result = await getIntegration('user-1', 'ws-1', 'google_drive')
    expect(result).toBeNull()
  })

  it('returns integration with decrypted refresh token', async () => {
    mockChain = createQueryMock({ data: mockIntegrationRow, error: null })
    vi.resetModules()
    vi.mock('@/lib/crypto', () => ({
      encrypt: vi.fn(() => MOCK_ENCRYPTED),
      decrypt: vi.fn(() => MOCK_DECRYPTED),
    }))
    vi.mock('@/lib/supabase/server', () => ({
      createClient: vi.fn(async () => mockChain),
    }))
    const { getIntegration } = await import('./integrations')
    const result = await getIntegration('user-1', 'ws-1', 'google_drive')
    expect(result).not.toBeNull()
    expect(result!.refreshToken).toBe(MOCK_DECRYPTED)
    expect(result!.providerAccountEmail).toBe('test@example.com')
  })
})

describe('upsertIntegration', () => {
  it('upserts and returns integration with encrypted token', async () => {
    mockChain = createQueryMock({ data: mockIntegrationRow, error: null })
    vi.resetModules()
    vi.mock('@/lib/crypto', () => ({
      encrypt: vi.fn(() => MOCK_ENCRYPTED),
      decrypt: vi.fn(() => MOCK_DECRYPTED),
    }))
    vi.mock('@/lib/supabase/server', () => ({
      createClient: vi.fn(async () => mockChain),
    }))
    const { upsertIntegration } = await import('./integrations')
    const result = await upsertIntegration({
      userId: 'user-1',
      workspaceId: 'ws-1',
      provider: 'google_drive',
      refreshToken: 'new-token',
      providerAccountEmail: 'test@example.com',
    })
    expect(result.id).toBe('int-1')
  })
})

describe('deleteIntegration', () => {
  it('deletes without error', async () => {
    const deleteChain: Record<string, unknown> = {}
    const methods = ['from', 'delete', 'eq']
    for (const m of methods) {
      deleteChain[m] = vi.fn(() => deleteChain)
    }
    deleteChain.eq = vi.fn(() => Promise.resolve({ error: null }))
    deleteChain.from = vi.fn(() => deleteChain)
    mockChain = deleteChain as ReturnType<typeof createQueryMock>

    vi.resetModules()
    vi.mock('@/lib/crypto', () => ({
      encrypt: vi.fn(() => MOCK_ENCRYPTED),
      decrypt: vi.fn(() => MOCK_DECRYPTED),
    }))
    vi.mock('@/lib/supabase/server', () => ({
      createClient: vi.fn(async () => mockChain),
    }))
    const { deleteIntegration } = await import('./integrations')
    await expect(deleteIntegration('int-1')).resolves.toBeUndefined()
  })
})

describe('updateRefreshToken', () => {
  it('updates encrypted refresh token', async () => {
    const updateChain: Record<string, unknown> = {}
    const methods = ['from', 'update', 'eq']
    for (const m of methods) {
      updateChain[m] = vi.fn(() => updateChain)
    }
    updateChain.eq = vi.fn(() => Promise.resolve({ error: null }))
    updateChain.from = vi.fn(() => updateChain)
    mockChain = updateChain as ReturnType<typeof createQueryMock>

    vi.resetModules()
    vi.mock('@/lib/crypto', () => ({
      encrypt: vi.fn(() => MOCK_ENCRYPTED),
      decrypt: vi.fn(() => MOCK_DECRYPTED),
    }))
    vi.mock('@/lib/supabase/server', () => ({
      createClient: vi.fn(async () => mockChain),
    }))
    const { updateRefreshToken } = await import('./integrations')
    await expect(updateRefreshToken('int-1', 'new-token')).resolves.toBeUndefined()
  })
})
