import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/crypto'
import type { Integration, IntegrationProvider, UpsertIntegrationParams } from '@/lib/types'

interface IntegrationRow {
  id: string
  user_id: string
  workspace_id: string
  provider: IntegrationProvider
  status: Integration['status']
  provider_account_email: string | null
  encrypted_refresh_token: string
}

function toIntegration(row: IntegrationRow): Integration {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    provider: row.provider,
    status: row.status,
    providerAccountEmail: row.provider_account_email,
    refreshToken: decrypt(row.encrypted_refresh_token),
  }
}

export async function getIntegration(userId: string, workspaceId: string, provider: IntegrationProvider): Promise<Integration | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('integrations')
    .select()
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)
    .single()

  if (error || !data) return null

  return toIntegration(data as IntegrationRow)
}

export async function upsertIntegration(params: UpsertIntegrationParams): Promise<Integration> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('integrations')
    .upsert(
      {
        user_id: params.userId,
        workspace_id: params.workspaceId,
        provider: params.provider,
        encrypted_refresh_token: encrypt(params.refreshToken),
        provider_account_email: params.providerAccountEmail,
        status: 'active',
      },
      { onConflict: 'user_id,workspace_id,provider' }
    )
    .select()
    .single()

  if (error || !data) throw new Error(`Failed to upsert integration: ${error?.message}`)

  return toIntegration(data as IntegrationRow)
}

export async function deleteIntegration(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('integrations')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete integration: ${error.message}`)
}

export async function updateRefreshToken(integrationId: string, refreshToken: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('integrations')
    .update({ encrypted_refresh_token: encrypt(refreshToken) })
    .eq('id', integrationId)

  if (error) throw new Error(`Failed to update refresh token: ${error.message}`)
}
