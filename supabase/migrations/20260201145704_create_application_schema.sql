-- ============================================================
-- Automatic updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Workspaces
-- ============================================================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Workspace Members
-- ============================================================
CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_see_own_workspaces" ON workspace_members
  USING (auth.uid() = user_id);

CREATE POLICY "members_see_workspace" ON workspaces
  USING (
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- Integrations (external service connections)
-- ============================================================
CREATE TYPE integration_provider AS ENUM ('google_drive');
CREATE TYPE integration_status AS ENUM ('active', 'error', 'revoked');

CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  provider integration_provider NOT NULL,
  status integration_status NOT NULL DEFAULT 'active',
  provider_account_email TEXT,
  encrypted_refresh_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, workspace_id, provider)
);

CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_integrations" ON integrations
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Chat Sessions
-- ============================================================
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_chat_sessions_workspace ON chat_sessions(workspace_id, updated_at DESC);

CREATE TRIGGER chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_members_see_sessions" ON chat_sessions
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- Chat Participants
-- ============================================================
CREATE TABLE chat_participants (
  chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (chat_session_id, user_id)
);

ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_see_own" ON chat_participants
  USING (auth.uid() = user_id);

-- ============================================================
-- Messages
-- ============================================================
CREATE TYPE message_role AS ENUM ('user', 'assistant');
CREATE TYPE message_status AS ENUM ('pending', 'streaming', 'completed', 'error');

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role message_role NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  status message_status NOT NULL DEFAULT 'completed',
  workflow_run_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT user_messages_have_sender CHECK (role != 'user' OR sender_id IS NOT NULL)
);

CREATE INDEX idx_messages_session ON messages(chat_session_id, created_at);

CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_see_messages" ON messages
  USING (
    chat_session_id IN (
      SELECT chat_session_id FROM chat_participants WHERE user_id = auth.uid()
    )
  );
