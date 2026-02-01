import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getIntegration, deleteIntegration } from '@/lib/db'
import { revokeToken } from '@/lib/google'
import type { IntegrationProvider } from '@/lib/types'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaceId = request.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
  }

  const integration = await getIntegration(user.id, workspaceId, provider as IntegrationProvider)
  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  try {
    await revokeToken(integration.refreshToken)
  } catch {
    // Token may already be revoked — continue with deletion
  }

  await deleteIntegration(integration.id)

  return NextResponse.json({ success: true })
}
