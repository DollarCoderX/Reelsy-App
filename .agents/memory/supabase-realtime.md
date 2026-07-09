---
name: Supabase Realtime for DMs and online presence
description: What's wired for realtime in the frontend
---

**DMs:** `artifacts/reelsy/src/hooks/useMessages.ts`
- `useConversations()` — lists all DM threads, subscribes to Postgres CDC for new message inserts
- `useMessages(conversationId)` — loads messages, subscribes to Postgres CDC filtered by conversation_id, deduplicates optimistic vs realtime inserts
- `sendMessage()` — sends via API + optimistically adds to state

**Notifications:** `artifacts/reelsy/src/context/NotificationContext.tsx`
- Supabase broadcast channel `notifications:{userId}` for instant friend-request toasts

**Online Presence:** `artifacts/reelsy/src/hooks/useOnlinePresence.ts`
- Supabase Realtime Presence channel `reelsy:online`
- Returns `{ onlineUsers, isOnline(username) }`
- Used in SearchTab to show green dots on user avatars

**Note:** Supabase Postgres CDC requires the `replication` feature to be enabled on the Supabase project for `postgres_changes` subscriptions to work.
