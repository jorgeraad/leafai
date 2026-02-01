import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Workspace } from '@/lib/types'

function toWorkspace(row: { id: string; name: string; created_at: string; updated_at: string }): Workspace {
  return {
    id: row.id,
    name: row.name,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export async function getOrCreateWorkspace(userId: string, displayName: string): Promise<Workspace> {
  // Check if user already has a workspace
  const existing = await getWorkspaceForUser(userId)
  if (existing) return existing

  // Use admin client to bypass RLS for INSERT (no INSERT policy by design)
  const admin = createAdminClient()

  // Create workspace
  const { data: workspace, error: wsError } = await admin
    .from('workspaces')
    .insert({ name: `${displayName}'s Workspace` })
    .select()
    .single()

  if (wsError || !workspace) throw new Error(`Failed to create workspace: ${wsError?.message}`)

  // Add user as member
  const { error: memberError } = await admin
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: userId })

  if (memberError) throw new Error(`Failed to add workspace member: ${memberError.message}`)

  return toWorkspace(workspace)
}

export async function getWorkspaceForUser(userId: string): Promise<Workspace | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspaces(*)')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (error || !data) return null

  const ws = data.workspaces as unknown as { id: string; name: string; created_at: string; updated_at: string }
  return toWorkspace(ws)
}
