import { createClient } from '@/lib/supabase/server'
import type { ChatSession } from '@/lib/types'

function toChatSession(row: { id: string; workspace_id: string; title: string | null; created_at: string; updated_at: string }): ChatSession {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export async function createChatSession(workspaceId: string, userId: string): Promise<ChatSession> {
  const supabase = await createClient()

  const { data: session, error: sessionError } = await supabase
    .from('chat_sessions')
    .insert({ workspace_id: workspaceId })
    .select()
    .single()

  if (sessionError || !session) throw new Error(`Failed to create chat session: ${sessionError?.message}`)

  const { error: participantError } = await supabase
    .from('chat_participants')
    .insert({ chat_session_id: session.id, user_id: userId })

  if (participantError) throw new Error(`Failed to add chat participant: ${participantError.message}`)

  return toChatSession(session)
}

export async function listChatSessions(workspaceId: string): Promise<ChatSession[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('chat_sessions')
    .select()
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`Failed to list chat sessions: ${error.message}`)

  return (data ?? []).map(toChatSession)
}

export async function getChatSession(id: string): Promise<ChatSession | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('chat_sessions')
    .select()
    .eq('id', id)
    .single()

  if (error || !data) return null

  return toChatSession(data)
}

export async function updateChatSessionTitle(id: string, title: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('chat_sessions')
    .update({ title })
    .eq('id', id)

  if (error) throw new Error(`Failed to update chat session title: ${error.message}`)
}
