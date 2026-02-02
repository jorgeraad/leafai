import { nanoid } from 'nanoid'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ChatSession, Message, MessagePart } from '@/lib/types'

interface ShareInfo {
  shareToken: string
  sharedAt: Date
}

function toChatSession(row: { id: string; workspace_id: string; title: string | null; created_at: string; updated_at: string }): ChatSession {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function toMessage(row: {
  id: string
  chat_session_id: string
  role: 'user' | 'assistant'
  sender_id: string | null
  parts: MessagePart[]
  status: string
  workflow_run_id: string | null
  created_at: string
}): Message {
  const base = {
    id: row.id,
    chatSessionId: row.chat_session_id,
    parts: row.parts,
    createdAt: new Date(row.created_at),
  }

  if (row.role === 'user') {
    return { ...base, role: 'user', senderId: row.sender_id!, status: 'completed' }
  }

  return {
    ...base,
    role: 'assistant',
    workflowRunId: row.workflow_run_id!,
    status: row.status as Message['status'],
  }
}

/** Get the active share clone for a session, if one exists */
export async function getShareForSession(chatSessionId: string): Promise<ShareInfo | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('share_token, shared_at')
    .eq('shared_from_session_id', chatSessionId)
    .single()

  if (error || !data) return null

  return {
    shareToken: data.share_token,
    sharedAt: new Date(data.shared_at),
  }
}

/** Create or update a shared clone of a session. Returns the share info. */
export async function createOrReplaceShare(chatSessionId: string): Promise<ShareInfo> {
  const supabase = createAdminClient()

  // Get original session
  const { data: original, error: origError } = await supabase
    .from('chat_sessions')
    .select('workspace_id, title')
    .eq('id', chatSessionId)
    .single()

  if (origError || !original) throw new Error(`Original session not found: ${origError?.message}`)

  // Check for existing clone
  const { data: existingClone } = await supabase
    .from('chat_sessions')
    .select('id, share_token')
    .eq('shared_from_session_id', chatSessionId)
    .single()

  const now = new Date().toISOString()
  let cloneId: string
  let shareToken: string

  if (existingClone) {
    // Update existing clone: delete old messages, update metadata
    cloneId = existingClone.id
    shareToken = existingClone.share_token

    await supabase
      .from('messages')
      .delete()
      .eq('chat_session_id', cloneId)

    await supabase
      .from('chat_sessions')
      .update({ title: original.title, shared_at: now })
      .eq('id', cloneId)
  } else {
    // Create new clone session
    shareToken = nanoid(10)

    const { data: newClone, error: cloneError } = await supabase
      .from('chat_sessions')
      .insert({
        workspace_id: original.workspace_id,
        title: original.title,
        share_token: shareToken,
        shared_from_session_id: chatSessionId,
        shared_at: now,
      })
      .select('id')
      .single()

    if (cloneError || !newClone) throw new Error(`Failed to create clone: ${cloneError?.message}`)
    cloneId = newClone.id
  }

  // Copy all messages from original to clone
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('role, sender_id, parts, status, workflow_run_id, created_at')
    .eq('chat_session_id', chatSessionId)
    .order('created_at', { ascending: true })

  if (msgError) throw new Error(`Failed to read messages: ${msgError.message}`)

  if (messages && messages.length > 0) {
    const clonedMessages = messages.map((m) => ({
      chat_session_id: cloneId,
      role: m.role,
      sender_id: m.sender_id,
      parts: m.parts,
      status: m.status,
      workflow_run_id: m.workflow_run_id,
      created_at: m.created_at,
    }))

    const { error: insertError } = await supabase
      .from('messages')
      .insert(clonedMessages)

    if (insertError) throw new Error(`Failed to clone messages: ${insertError.message}`)
  }

  return { shareToken, sharedAt: new Date(now) }
}

/** Delete the shared clone of a session (revoke sharing). */
export async function deleteShare(chatSessionId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: clone } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('shared_from_session_id', chatSessionId)
    .single()

  if (!clone) return

  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', clone.id)

  if (error) throw new Error(`Failed to delete share: ${error.message}`)
}

/** Get a shared session by its public token (for the public view). */
export async function getSharedSession(
  shareToken: string
): Promise<{ session: ChatSession; messages: Message[] } | null> {
  const supabase = createAdminClient()

  const { data: sessionData, error: sessionError } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('share_token', shareToken)
    .single()

  if (sessionError || !sessionData) return null

  const { data: messagesData, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_session_id', sessionData.id)
    .order('created_at', { ascending: true })

  if (msgError) throw new Error(`Failed to load shared messages: ${msgError.message}`)

  return {
    session: toChatSession(sessionData),
    messages: (messagesData ?? []).map((row) => toMessage(row as Parameters<typeof toMessage>[0])),
  }
}
