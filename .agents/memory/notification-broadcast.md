---
name: Notification broadcast pattern
description: How to create and instantly push notifications to recipients via Supabase Realtime.
---

## Rule
Every notification insert into MongoDB must be followed by a `broadcastNotification()` call so recipients get instant push instead of waiting 30 seconds for polling.

**How to apply:**
```typescript
const notif = { userId, fromUserId, ..., createdAt: new Date() };
const inserted = await notifCol.insertOne(notif);
broadcastNotification({
  ...notif,
  _id: inserted.insertedId.toString(),
  createdAt: notif.createdAt.toISOString(),
  // Serialize ObjectIds to strings
}).catch(() => {});
```

The call is fire-and-forget (`.catch(() => {})`). If Supabase is not ready, the 30-second polling fallback in `NotificationContext.tsx` picks it up.

The channel name is `notifications:${notification.userId}` — must match what `NotificationContext` subscribes to.

**Why:** Without broadcast, friend requests and engagement events only appear after the 30-second polling interval, making the app feel unresponsive.

## userId reliability
`toUserId` in friends.ts is computed as `toUser.supabaseId || toUser._id.toString() || toUsername`. If supabaseId is missing in MongoDB, the notification `userId` won't match the client's poll key (which is `user.supabaseId`). `getUserNotifications` now accepts an optional `username` fallback and queries with `$or: [{ userId }, { userId: username }]` to handle this.
