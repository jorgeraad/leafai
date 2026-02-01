import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
      }),
    },
  }),
}))

vi.mock('@/lib/google', () => ({
  exchangeCodeForTokens: vi.fn().mockResolvedValue({
    accessToken: 'access-tok',
    refreshToken: 'refresh-tok',
  }),
}))

vi.mock('@/lib/db', () => ({
  upsertIntegration: vi.fn().mockResolvedValue({
    id: 'int-1',
    userId: 'user-123',
    workspaceId: 'ws-1',
    provider: 'google_drive',
    status: 'active',
    providerAccountEmail: 'test@example.com',
    refreshToken: 'refresh-tok',
  }),
}))

vi.mock('googleapis', () => {
  class MockOAuth2 {
    setCredentials = vi.fn()
  }
  return {
    google: {
      auth: {
        OAuth2: MockOAuth2,
      },
      oauth2: vi.fn().mockReturnValue({
        userinfo: {
          get: vi.fn().mockResolvedValue({ data: { email: 'test@example.com' } }),
        },
      }),
    },
  }
})

describe('GET /auth/integrations/google-drive/callback', () => {
  const validState = btoa(JSON.stringify({ workspaceId: 'ws-1', userId: 'user-123' }))

  it('returns 400 if code or state is missing', async () => {
    const request = new NextRequest('http://localhost:3000/auth/integrations/google-drive/callback')
    const response = await GET(request)
    expect(response.status).toBe(400)
  })

  it('returns 400 if state is invalid', async () => {
    const request = new NextRequest('http://localhost:3000/auth/integrations/google-drive/callback?code=abc&state=invalid')
    const response = await GET(request)
    expect(response.status).toBe(400)
  })

  it('returns 401 if user does not match state', async () => {
    const badState = btoa(JSON.stringify({ workspaceId: 'ws-1', userId: 'other-user' }))
    const request = new NextRequest(`http://localhost:3000/auth/integrations/google-drive/callback?code=abc&state=${badState}`)
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('exchanges code, upserts integration, and redirects to settings', async () => {
    const { exchangeCodeForTokens } = await import('@/lib/google')
    const { upsertIntegration } = await import('@/lib/db')

    const request = new NextRequest(`http://localhost:3000/auth/integrations/google-drive/callback?code=auth-code&state=${validState}`)
    const response = await GET(request)

    expect(exchangeCodeForTokens).toHaveBeenCalledWith('auth-code')
    expect(upsertIntegration).toHaveBeenCalledWith({
      userId: 'user-123',
      workspaceId: 'ws-1',
      provider: 'google_drive',
      refreshToken: 'refresh-tok',
      providerAccountEmail: 'test@example.com',
    })
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/w/ws-1/settings/integrations')
  })
})
