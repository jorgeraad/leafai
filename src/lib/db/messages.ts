import { createClient } from '@/lib/supabase/server'
import type { AssistantMessage, Message, MessagePart, UserMessage } from '@/lib/types'

interface MessageRow {
  id: string
  chat_session_id: string
  role: 'user' | 'assistant'
  sender_id: string | null
  parts: MessagePart[]
  status: string
  workflow_run_id: string | null
  created_at: string
}

function toMessage(row: MessageRow): Message {
  const base = {
    id: row.id,
    chatSessionId: row.chat_session_id,
    parts: row.parts,
    createdAt: new Date(row.created_at),
  }

  if (row.role === 'user') {
    return { ...base, role: 'user', senderId: row.sender_id!, status: 'completed' } satisfies UserMessage
  }

  return {
    ...base,
    role: 'assistant',
    workflowRunId: row.workflow_run_id!,
    status: row.status as AssistantMessage['status'],
  } satisfies AssistantMessage
}

export async function createUserMessage(chatSessionId: string, userId: string, content: string): Promise<UserMessage> {
  const supabase = await createClient()

  const parts: MessagePart[] = [{ type: 'text', text: content }]

  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_session_id: chatSessionId,
      role: 'user',
      sender_id: userId,
      parts,
      status: 'completed',
    })
    .select()
    .single()

  if (error || !data) throw new Error(`Failed to create user message: ${error?.message}`)

  return toMessage(data as MessageRow) as UserMessage
}

export async function createPendingAssistantMessage(chatSessionId: string, workflowRunId: string): Promise<AssistantMessage> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_session_id: chatSessionId,
      role: 'assistant',
      parts: [],
      status: 'pending',
      workflow_run_id: workflowRunId,
    })
    .select()
    .single()

  if (error || !data) throw new Error(`Failed to create assistant message: ${error?.message}`)

  return toMessage(data as MessageRow) as AssistantMessage
}

export async function completeAssistantMessage(messageId: string, parts: MessagePart[]): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('messages')
    .update({ parts, status: 'completed' })
    .eq('id', messageId)

  if (error) throw new Error(`Failed to complete assistant message: ${error.message}`)
}

export async function failAssistantMessage(messageId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('messages')
    .update({ status: 'error' })
    .eq('id', messageId)

  if (error) throw new Error(`Failed to fail assistant message: ${error.message}`)
}

export async function listMessages(chatSessionId: string): Promise<Message[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select()
    .eq('chat_session_id', chatSessionId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to list messages: ${error.message}`)

  return (data ?? []).map((row) => toMessage(row as MessageRow))
}
