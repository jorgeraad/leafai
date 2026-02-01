import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens } from '@/lib/google'
import { upsertIntegration } from '@/lib/db'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 })
  }

  let parsed: { workspaceId: string; userId: string }
  try {
    parsed = JSON.parse(atob(state))
  } catch {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== parsed.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tokens = await exchangeCodeForTokens(code)

  // Get the connected account email
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: tokens.accessToken })
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data: userInfo } = await oauth2.userinfo.get()

  await upsertIntegration({
    userId: user.id,
    workspaceId: parsed.workspaceId,
    provider: 'google_drive',
    refreshToken: tokens.refreshToken,
    providerAccountEmail: userInfo.email ?? null,
  })

  return NextResponse.redirect(new URL(`/w/${parsed.workspaceId}/settings/integrations`, request.url))
}
