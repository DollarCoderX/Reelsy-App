---
name: Messaging vs friend policy
description: Two separate privacy settings control friend requests vs direct messages.
---

## Rule
`friendPolicy` and `messagingPolicy` are separate user settings stored in MongoDB.

- `friendPolicy`: `'open'` | `'request-only'` — controls who can send friend requests
- `messagingPolicy`: `'everyone'` | `'friends-only'` — controls who can start a DM conversation

**Backend enforcement (messages.ts):**
```typescript
const msgPolicy = targetUser.messagingPolicy ||
  (targetUser.friendPolicy === 'request-only' ? 'friends-only' : 'everyone');
if (msgPolicy === 'friends-only') { /* check friendship */ }
```
Legacy users without `messagingPolicy` fall back to `friendPolicy` for backwards compatibility.

**Frontend (SettingsTab PrivacySheet):** Two separate sections — "Who can add you as a friend" and "Who can message you". Both saved in the same `PATCH /api/users/:username/settings` call.

**Why:** Users may want to allow friend requests from anyone but restrict DMs to friends only (or vice versa). Combining these into one setting was confusing.
