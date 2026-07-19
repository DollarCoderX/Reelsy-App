-- Reelsy messaging tables
-- Run this once in your Supabase project → SQL Editor

-- 1. Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT
);

-- 2. Participants (who is in each conversation)
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,        -- Supabase UUID or username fallback
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS participants_user_idx ON conversation_participants(user_id);

-- 3. Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_username TEXT NOT NULL,
  sender_avatar TEXT,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT now(),
  read_by TEXT[] DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS messages_conv_idx ON messages(conversation_id, created_at DESC);

-- 4. Enable RLS (Realtime requires it)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 5. Allow service role full access (used by the API server)
CREATE POLICY "service_role_all_conversations" ON conversations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_participants" ON conversation_participants
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_messages" ON messages
  FOR ALL USING (auth.role() = 'service_role');

-- 6. Enable Realtime on messages so broadcasts work
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
