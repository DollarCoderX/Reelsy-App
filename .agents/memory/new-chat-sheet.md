---
name: New Chat sheet pattern
description: How the New Chat UI works in ChatTab
---

**Rule:** The "New Chat" button in ChatTab opens `NewChatSheet`, a full-screen slide-up overlay.

**State:** `showNewChat: boolean` in ChatTab — toggled by the "New Chat" menu item.

**NewChatSheet.tsx sections:**
1. **Friends list** — fetched from `GET /api/friends/:username`, returns `{ friends: [...], count }` where each friend has `username`, `displayName`, `profileImage`
2. **Phone number search** — debounced 600ms → `GET /api/auth/search-by-phone?phone=digits`; returns `{ found, username, displayName, profileImage }`
3. **Existing chat badge** — shows "Chatting" if the username is already in `dmConversations`

**onStartChat flow:**
```
api.messages.getOrCreateConversation({ myUserId, myUsername, ..., otherUserId, otherUsername, ... })
→ setActiveDmConv({ id: conversation.id, otherUsername, otherDisplayName, otherAvatar })
```
On 403 (friends-only policy): setActiveDmConv with `id: "blocked-" + username`.

**Phone backend:** `GET /api/auth/search-by-phone?phone=digits` — searches MongoDB users collection by `phone` field (digits-only stored). Profile update also accepts `phone` and `bio` params now.
