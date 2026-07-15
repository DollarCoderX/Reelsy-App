---
name: Media storage
description: How image/video uploads flow from PostComposer to Supabase Storage.
---

## Rule
All media must go through `/api/media/upload` → Supabase Storage bucket `media` (public). Never store base64 data URLs in MongoDB — they exceed document size limits and are slow.

**Frontend flow (PostComposer.tsx):**
- `handleImage`/`handleVideo` create object URLs or data URLs locally for preview
- `submitPost` iterates `mediaUrls`, converts each non-http URL to a Blob via `fetch(url).then(r => r.blob())`, POSTs to `/api/media/upload` as multipart form, replaces URL with returned `mediaUrl`
- Falls back to local URL if upload fails (graceful degradation)

**Backend (media.ts):**
- `multer.memoryStorage()` — no disk writes
- Uploads buffer to Supabase Storage: `client.storage.from('media').upload(filename, file.buffer, { contentType })`
- Returns `{ mediaUrl: publicUrl, mediaType }`
- `ensureBucket()` called at startup to auto-create the `media` bucket if missing

**Setup:** Run `node scripts/setup-supabase.mjs` to create the bucket with correct public access settings.

**Why:** `/tmp/uploads` (previous approach) is ephemeral and lost on restarts. Supabase Storage provides durable public CDN URLs.
