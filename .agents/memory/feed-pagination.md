---
name: Feed cursor pagination pattern
description: How cursor pagination is implemented in posts.ts and api.ts
---

**Rule:** Sort by `_id: -1` (not `createdAt`) and use `_id` as the cursor. Filter with `{ _id: { $lt: ObjectId(before) } }`.

**Why:** Mixing sort key (createdAt) with cursor filter key (_id) causes skipped/duplicated items when timestamps diverge. ObjectId is monotonically increasing and encodes creation time.

**How to apply:** Any new paginated endpoints in MongoDB should follow the same `_id` sort + cursor pattern. Frontend passes `before=<last_id>` as query param.

Backend response: `{ posts, hasMore, nextCursor }` where `nextCursor` = stringified last `_id`.
