-- Add sharing columns to chat_sessions
ALTER TABLE public.chat_sessions
  ADD COLUMN share_token VARCHAR(16) UNIQUE,
  ADD COLUMN shared_from_session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  ADD COLUMN shared_at TIMESTAMPTZ;

-- Only one active clone per original session
CREATE UNIQUE INDEX idx_chat_sessions_shared_from ON public.chat_sessions(shared_from_session_id) WHERE shared_from_session_id IS NOT NULL;

-- Fast lookup by share token
CREATE INDEX idx_chat_sessions_share_token ON public.chat_sessions(share_token) WHERE share_token IS NOT NULL;

-- RLS policy: allow anyone to SELECT shared sessions (where share_token is set)
CREATE POLICY "Anyone can view shared sessions"
  ON public.chat_sessions
  FOR SELECT
  USING (share_token IS NOT NULL);

-- RLS policy: allow anyone to SELECT messages belonging to shared sessions
CREATE POLICY "Anyone can view messages of shared sessions"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = messages.chat_session_id
        AND chat_sessions.share_token IS NOT NULL
    )
  );
