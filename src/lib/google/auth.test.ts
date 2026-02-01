import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGenerateAuthUrl = vi.fn()
const mockGetToken = vi.fn()
const mockRevokeToken = vi.fn()

vi.mock('googleapis', () => {
  const OAuth2 = vi.fn(function (this: Record<string, unknown>) {
    this.generateAuthUrl = mockGenerateAuthUrl
    this.getToken = mockGetToken
    this.revokeToken = mockRevokeToken
  })
  return {
    google: {
      auth: { OAuth2 },
    },
  }
})

import { createOAuth2Client, getAuthUrl, exchangeCodeForTokens, revokeToken } from './auth'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.GOOGLE_CLIENT_ID = 'test-client-id'
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
  process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/callback'
})

describe('createOAuth2Client', () => {
  it('returns an OAuth2Client instance', () => {
    const client = createOAuth2Client()
    expect(client).toBeDefined()
    expect(client.generateAuthUrl).toBeDefined()
  })
})

describe('getAuthUrl', () => {
  it('returns URL with drive.readonly scope and offline access', () => {
    mockGenerateAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?...')
    const url = getAuthUrl('test-state')
    expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive.readonly'],
      state: 'test-state',
    })
    expect(url).toBe('https://accounts.google.com/o/oauth2/v2/auth?...')
  })
})

describe('exchangeCodeForTokens', () => {
  it('returns GoogleTokens on success', async () => {
    mockGetToken.mockResolvedValue({
      tokens: {
        access_token: 'access-123',
        refresh_token: 'refresh-456',
      },
    })
    const result = await exchangeCodeForTokens('auth-code')
    expect(mockGetToken).toHaveBeenCalledWith('auth-code')
    expect(result).toEqual({
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
    })
  })

  it('throws when tokens are missing', async () => {
    mockGetToken.mockResolvedValue({ tokens: {} })
    await expect(exchangeCodeForTokens('bad-code')).rejects.toThrow('Missing tokens')
  })
})

describe('revokeToken', () => {
  it('calls the revocation endpoint', async () => {
    mockRevokeToken.mockResolvedValue({})
    await revokeToken('refresh-456')
    expect(mockRevokeToken).toHaveBeenCalledWith('refresh-456')
  })
})
