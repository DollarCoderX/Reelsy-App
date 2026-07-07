# Reelsy

A full-featured social app — posts, stories, friends, direct messages, AI chat, and more — built for global launch.

## Run & Operate

- `pnpm --filter @workspace/reelsy run dev` — frontend dev server (port 8080)
- `pnpm --filter @workspace/api-server run dev` — API server (port 3000; build + start)
- `pnpm run typecheck` — full typecheck across all packages

## Required Environment Variables

**API Server** (`artifacts/api-server/.env`):
- `MONGODB_URI` — MongoDB connection string
- `MONGODB_DB` — database name (e.g. `reelsy`)
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — Supabase service role key
- `PORT` — server port (must be `3000` for the frontend proxy to work)

**Frontend** (`artifacts/reelsy/.env`):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.x
- Frontend: React 18 + Vite + Tailwind CSS + Framer Motion
- API: Express 5 + pino logging
- DB: MongoDB (posts, users, friends, engagement) + Supabase (auth, realtime DMs)
- AI: Pollinations API (free, no key required)
- Build: esbuild (API), Vite (frontend)

## Architecture

- **Frontend proxy**: Vite proxies `/api/*` to `localhost:3000` — never hardcode backend URLs in app code.
- **Auth**: Supabase JWT + MongoDB user profile stored in localStorage (`reelsy_user`).
- **Posts**: Created in MongoDB. Local-only posts (no backend running) stored in `localStorage.reelsy_user_posts`, merged into feed on load.
- **DMs**: Supabase Realtime `messages` + `conversations` tables; `useConversations` / `useMessages` hooks.
- **Multi-account**: Extra accounts stored in `localStorage.reelsy_extra_accounts` (Pro feature).
- **Help Center**: AI-powered via Pollinations; no API key needed.

## Where things live

- Frontend tabs: `artifacts/reelsy/src/components/tabs/`
- API routes: `artifacts/api-server/src/routes/`
- Shared hooks: `artifacts/reelsy/src/hooks/`
- AppContext (user, tier, theme): `artifacts/reelsy/src/context/AppContext.tsx`
- API typed client: `artifacts/reelsy/src/lib/api.ts`
- Supabase helpers: `artifacts/api-server/src/lib/supabase.ts`

## User preferences

- Keep existing bot/SMS chat logic intact when adding real DM features.
- Ad posts (ad-1 through ad-4) must remain in the feed; they use non-MongoDB IDs, so skip BSON validation for them.

## Gotchas

- The "artifacts/api-server: API Server" workflow tries to bind port 8080 (conflicts with frontend). Always use the **"Start API server"** workflow (port 3000).
- Ad post IDs (`ad-1`, `ad-2`, etc.) are not valid MongoDB ObjectIds — the engagement routes must guard against this.
- `initSupabase()` is called at startup in `index.ts`; Supabase `fetch failed` errors are non-fatal (network-restricted env) — MongoDB routes still work.
- When switching accounts via MultiAccountSheet, both `setUser` and `setTier` must be called in AppContext.
