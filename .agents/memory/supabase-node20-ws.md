---
name: Supabase Node 20 WebSocket
description: Supabase Realtime requires the ws package on Node.js < 22; native WebSocket is not available.
---

## Rule
When running on Node.js 20, `@supabase/supabase-js` Realtime crashes at `createClient` time unless you pass the `ws` package as the transport option.

**How to apply:**
```typescript
import ws from 'ws';
supabaseClient = createClient(url, key, { realtime: { transport: ws } });
```

Also install `ws` and `@types/ws` in the api-server package.

**Why:** Node.js 20 does not have a native global `WebSocket` constructor in the server environment. The Supabase Realtime client (`@supabase/realtime-js`) detects this and throws. Node.js 22+ adds native WebSocket, so this fix may become unnecessary on upgrade.

**Side effect to watch:** The `undici` package (v8+) also crashes on Node 20 with `webidl.util.markAsUncloneable is not a function`. Remove any `import { fetch } from 'undici'` in server code — use the native `fetch` global instead (available in Node 18+).
