export type IntegrationProvider = 'google_drive'
export type IntegrationStatus = 'active' | 'error' | 'revoked'
export type MessageStatus = 'pending' | 'streaming' | 'completed' | 'error'

export interface Workspace {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface ChatSession {
  id: string
  workspaceId: string
  title: string | null
  createdAt: Date
  updatedAt: Date
}

interface BaseMessage {
  id: string
  chatSessionId: string
  parts: MessagePart[]
  createdAt: Date
}

export interface UserMessage extends BaseMessage {
  role: 'user'
  senderId: string
  status: 'completed'
}

export interface AssistantMessage extends BaseMessage {
  role: 'assistant'
  workflowRunId: string
  status: MessageStatus
}

export type Message = UserMessage | AssistantMessage

export type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; args: Record<string, unknown> }
  | { type: 'tool-result'; toolCallId: string; result: unknown }

export interface Integration {
  id: string
  userId: string
  workspaceId: string
  provider: IntegrationProvider
  status: IntegrationStatus
  providerAccountEmail: string | null
  refreshToken: string
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
}

export interface GoogleTokens {
  accessToken: string
  refreshToken: string
}

export interface AgentResult {
  id: string
  parts: MessagePart[]
}

export interface UpsertIntegrationParams {
  userId: string
  workspaceId: string
  provider: IntegrationProvider
  refreshToken: string
  providerAccountEmail: string | null
}

export interface SendMessageRequest {
  chatSessionId: string
  content: string
}

export interface RunReconnectParams {
  runId: string
  startIndex?: number
}

export interface AuthFormState {
  error: string | null
  success: string | null
}
