# Supabase Table Setup Guide

This document contains all the SQL DDL and RLS policies you need to create in your Supabase project for Reelsy to work fully.

Open your Supabase dashboard → **SQL Editor** and run each section.

---

## 1. Messages & Conversations

```sql
-- Conversations (DM threads)
CREATE TABLE IF NOT EXISTS conversations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  last_message_at  timestamptz DEFAULT now(),
  last_message_preview text
);

-- Who is in each conversation
CREATE TABLE IF NOT EXISTS conversation_participants (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid REFERENCES conversations(id) ON DELETE CASCADE,
  user_id          text NOT NULL,          -- Supabase auth user ID
  username         text NOT NULL,
  display_name     text,
  avatar_url       text,
  joined_at        timestamptz DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

-- Individual messages
CREATE TABLE IF NOT EXISTS messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        text NOT NULL,          -- Supabase auth user ID
  sender_username  text NOT NULL,
  content          text,
  media_url        text,
  media_type       text,                  -- 'image' | 'video' | 'audio'
  reply_to_id      uuid REFERENCES messages(id),
  read_by          text[] DEFAULT '{}',   -- array of user IDs who have read it
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
```

---

## 2. Friend Requests

```sql
CREATE TABLE IF NOT EXISTS friend_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id     text NOT NULL,
  from_username    text NOT NULL,
  from_display_name text,
  from_avatar      text,
  to_user_id       text NOT NULL,
  to_username      text NOT NULL,
  status           text NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'declined'
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_from ON friend_requests(from_user_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to   ON friend_requests(to_user_id, status);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
```

---

## 3. Friends

```sql
CREATE TABLE IF NOT EXISTS friends (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              text NOT NULL,
  friend_id            text NOT NULL,
  username             text NOT NULL,       -- user's own username
  friend_username      text NOT NULL,
  friend_display_name  text,
  friend_avatar        text,
  created_at           timestamptz DEFAULT now(),
  UNIQUE (user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user   ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends(friend_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE friends;
```

---

## 4. Notifications

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL,            -- recipient (Supabase user ID)
  from_user_id    text,
  from_username   text,
  from_display_name text,
  from_profile_image text,
  type            text NOT NULL,            -- 'friend_request' | 'friend_accepted' | 'like' | 'comment' | 'mention' | 'profile_view'
  request_id      text,                     -- friend_requests.id for friend_request/accepted types
  post_id         text,                     -- for like/comment notifications
  read            boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

---

## 5. Row-Level Security (RLS) Policies

Reelsy's API server uses the **service role key** (bypasses RLS entirely), so you only need RLS if you ever plan to use the anon key directly from the frontend. For now, the service role key handles all writes.

If you want to add RLS in the future for extra protection:

```sql
-- Example: only the involved users can read a conversation
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Participants can read their own conversations
CREATE POLICY "participants_read" ON conversations
  FOR SELECT USING (
    id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()::text
    )
  );

-- Sender and participants can read messages
CREATE POLICY "messages_read" ON messages
  FOR SELECT USING (
    sender_id = auth.uid()::text
    OR conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()::text
    )
  );
```

> **Note:** Since the API server uses the `SUPABASE_SERVICE_KEY`, these policies are bypassed for server-side operations. They only apply to any future direct client-side Supabase calls.

---

## 6. Quick Reference — What Each Table Is Used For

| Table | Used for |
|---|---|
| `conversations` | DM thread records (one per pair of users) |
| `conversation_participants` | Who's in each conversation (username, avatar) |
| `messages` | Individual DMs with content/media/reply support |
| `friend_requests` | Pending/accepted/declined friend requests (replaces MongoDB) |
| `friends` | Bidirectional friendship pairs (replaces MongoDB) |
| `notifications` | Real-time push notifications via Supabase Realtime broadcast |

---

## 7. Running This

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Paste each section above and click **Run**
4. Check the **Table Editor** to confirm all tables were created
5. Verify Realtime is enabled: go to **Replication** → confirm the tables are in the publication

That's it! The API server (`artifacts/api-server`) will automatically use these tables once they exist.
