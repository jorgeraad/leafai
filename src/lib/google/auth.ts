import { google } from 'googleapis'
import type { GoogleTokens } from '@/lib/types'

const DRIVE_READONLY_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'

export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    const missing = [
      !clientId && 'GOOGLE_CLIENT_ID',
      !clientSecret && 'GOOGLE_CLIENT_SECRET',
      !redirectUri && 'GOOGLE_REDIRECT_URI',
    ].filter(Boolean).join(', ')
    throw new Error(`Missing required env vars: ${missing}`)
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function getAuthUrl(state: string): string {
  const client = createOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['email', DRIVE_READONLY_SCOPE],
    state,
  })
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const client = createOAuth2Client()
  const { tokens } = await client.getToken(code)
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Missing tokens in Google OAuth response')
  }
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  }
}

export async function revokeToken(token: string): Promise<void> {
  const client = createOAuth2Client()
  await client.revokeToken(token)
}
