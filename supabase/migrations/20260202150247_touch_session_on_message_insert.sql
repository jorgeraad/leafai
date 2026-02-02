-- Bump chat_sessions.updated_at whenever a new message is inserted,
-- so sidebar sorting by updated_at reflects the most recent message.

CREATE OR REPLACE FUNCTION touch_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions SET updated_at = now() WHERE id = NEW.chat_session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_touch_session
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION touch_session_on_message();
