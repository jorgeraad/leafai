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
  getAuthUrl: vi.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock=true'),
}))

describe('GET /auth/integrations/google-drive', () => {
  it('returns 400 if workspaceId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/auth/integrations/google-drive')
    const response = await GET(request)
    expect(response.status).toBe(400)
  })

  it('redirects to Google OAuth with correct state', async () => {
    const request = new NextRequest('http://localhost:3000/auth/integrations/google-drive?workspaceId=ws-1')
    const response = await GET(request)
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://accounts.google.com/o/oauth2/v2/auth?mock=true')
  })

  it('redirects to login if user is not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as any)

    const request = new NextRequest('http://localhost:3000/auth/integrations/google-drive?workspaceId=ws-1')
    const response = await GET(request)
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/login')
  })
})
