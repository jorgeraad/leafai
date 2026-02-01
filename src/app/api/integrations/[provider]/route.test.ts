import { describe, it, expect, vi } from 'vitest'
import { DELETE } from './route'
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

vi.mock('@/lib/db', () => ({
  getIntegration: vi.fn().mockResolvedValue({
    id: 'int-1',
    userId: 'user-123',
    workspaceId: 'ws-1',
    provider: 'google_drive',
    status: 'active',
    providerAccountEmail: 'test@example.com',
    refreshToken: 'refresh-tok',
  }),
  deleteIntegration: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/google', () => ({
  revokeToken: vi.fn().mockResolvedValue(undefined),
}))

describe('DELETE /api/integrations/[provider]', () => {
  const params = Promise.resolve({ provider: 'google_drive' })

  it('returns 401 if not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/integrations/google_drive?workspaceId=ws-1')
    const response = await DELETE(request, { params })
    expect(response.status).toBe(401)
  })

  it('returns 400 if workspaceId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/integrations/google_drive')
    const response = await DELETE(request, { params })
    expect(response.status).toBe(400)
  })

  it('returns 404 if integration not found', async () => {
    const { getIntegration } = await import('@/lib/db')
    vi.mocked(getIntegration).mockResolvedValueOnce(null)

    const request = new NextRequest('http://localhost:3000/api/integrations/google_drive?workspaceId=ws-1')
    const response = await DELETE(request, { params })
    expect(response.status).toBe(404)
  })

  it('revokes token, deletes integration, returns success', async () => {
    const { revokeToken } = await import('@/lib/google')
    const { deleteIntegration } = await import('@/lib/db')

    const request = new NextRequest('http://localhost:3000/api/integrations/google_drive?workspaceId=ws-1')
    const response = await DELETE(request, { params })

    expect(revokeToken).toHaveBeenCalledWith('refresh-tok')
    expect(deleteIntegration).toHaveBeenCalledWith('int-1')

    const body = await response.json()
    expect(body).toEqual({ success: true })
  })
})
