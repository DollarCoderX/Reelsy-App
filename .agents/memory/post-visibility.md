---
name: Post visibility (localStorage vs MongoDB)
description: Posts must be saved to MongoDB via API, not just localStorage
---

# Post visibility

## The rule
`handleNewPost` in `HomeTab.tsx` must call `api.posts.create()` to save posts to MongoDB before updating local state.

## Why
The original code only wrote to `localStorage` (`reelsy_user_posts`). Other users load posts from MongoDB via `GET /api/posts`, so locally-stored posts were invisible to everyone else.

## How to apply
- `handleNewPost` is now async and calls `await api.posts.create({ authorUsername, authorDisplayName, authorAvatar, content, type, media, music, location })` before the setTimeout/local state update
- Failures are caught and logged (non-fatal) so local UX still works offline
- The API response is not awaited for the optimistic local update — they run in parallel
