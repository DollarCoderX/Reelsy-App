---
name: ObjectId guard pattern
description: Must validate postId before new ObjectId() to avoid BSONError on fake/ad post IDs
---

**Rule:** Always call `isValidObjectId(id)` before `new ObjectId(id)` in engagement.ts helpers.

```typescript
function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}
```

**Why:** The feed includes fake ad posts with IDs like `ad-1`, `ad-2`, `user-*`. These are not valid 24-char hex strings. Calling `new ObjectId("ad-1")` throws a `BSONError` which returns a 500 to the client.

**How to apply:** All engagement helpers that accept postId — `userLikedPost`, `userSavedPost`, `getPostComments`, and any route using `new ObjectId(postId)` — must guard with `if (!isValidObjectId(postId)) return false/[]/null;` before the ObjectId constructor call.

The guard is already in place in `engagement.ts` (session added July 2026).
