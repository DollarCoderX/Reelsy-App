# Reelsy — Setup Guide

Complete this checklist before the app will fully work. Each section tells you exactly what to do and why.

---

## 1. Supabase

### 1a. Create a Supabase project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a region close to your users

### 1b. Get your API keys
In your Supabase dashboard → **Project Settings → API**:
| Secret name | Where to find it |
|---|---|
| `SUPABASE_URL` | "Project URL" (e.g. `https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | "service_role" key (keep this private — server only) |

Add both as **Replit Secrets** (the padlock icon in the sidebar).

### 1c. Enable Google OAuth
1. Supabase dashboard → **Authentication → Providers → Google**
2. Toggle **Enable** on
3. Create a Google OAuth client at [console.cloud.google.com](https://console.cloud.google.com):
   - Add `https://<your-supabase-project>.supabase.co/auth/v1/callback` as an authorised redirect URI
4. Paste the **Client ID** and **Client Secret** into Supabase
5. Save

### 1d. Disable email confirmation for Google users (prevents auto-ban)
The app already calls `auth.admin.updateUserById` to confirm emails for Google sign-ups automatically. If users are still being banned:
1. Supabase dashboard → **Authentication → Providers → Email**
2. Turn off **"Confirm email"** (or leave on — the server will confirm Google users programmatically)

### 1e. Run required SQL
In Supabase → **SQL Editor** → run:
```sql
-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Optional: users table for tier metadata
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  "displayName" VARCHAR(255) NOT NULL,
  tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'premium+', 'gold', 'verified')),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
```

---

## 2. MongoDB Atlas

### 2a. Create a free cluster
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) → Create a free M0 cluster
2. Create a database user (username + password)
3. Whitelist all IPs: `0.0.0.0/0` (required for Replit's dynamic IPs)

### 2b. Get the connection string
1. Atlas dashboard → **Database → Connect → Drivers**
2. Copy the connection string, e.g.:  
   `mongodb+srv://username:password@cluster0.abc123.mongodb.net/`
3. Replace `<password>` with your actual password

### 2c. Add secrets to Replit
| Secret name | Value |
|---|---|
| `MONGODB_URI` | Your full Atlas connection string |
| `MONGODB_DB` | `reelsy` (or any name you choose) |

### 2d. Collections (created automatically on first use)
The API server creates these collections automatically when first written to:
- `users` — MongoDB user profiles
- `posts` — all posts
- `notifications` — in-app notifications
- `friend_requests` — pending friend requests
- `friends` — accepted friendships (bidirectional records)
- `blocks` — blocks and mutes
- `engagement` — likes, comments, reshares, saves
- `appeals` — suspension/ban appeal submissions

### 2e. Recommended indexes (run in Atlas → Collections → Indexes)
```js
// posts — feed & profile queries
{ authorUsername: 1, _id: -1 }
{ _id: -1 }

// notifications — per-user inbox
{ userId: 1, createdAt: -1 }
{ userId: 1, read: 1 }

// friend_requests
{ fromUserId: 1, toUserId: 1, status: 1 }
{ toUserId: 1, status: 1 }

// blocks
{ username: 1, targetUsername: 1, type: 1 }
```

---

## 3. Other environment variables

Add these as **Replit Secrets**:

| Secret | Purpose | Required? |
|---|---|---|
| `SESSION_SECRET` | Express session signing | ✅ Yes |
| `JWT_SECRET` | Auth token signing | ✅ Yes — set any long random string |
| `BREVO_API_KEY` | Transactional emails (OTP, suspension appeals) | ⚠️ Optional (appeals still save to MongoDB without it) |
| `APP_URL` | Your public Replit URL (e.g. `https://reelsy.your-handle.repl.co`) | ⚠️ Optional |
| `GROQ_API_KEY` | AI features | ⚠️ Optional |

---

## 4. Starting the app

Both workflows must be running simultaneously:

1. **Start API server** — runs on port 3000 (Express backend)
2. **Start application** — runs on port 8080 (Vite frontend, proxies `/api` to port 3000)

The preview pane shows the **frontend** (port 8080). If the API server is not running, API calls will silently fail.

---

## 5. Common problems

| Symptom | Cause | Fix |
|---|---|---|
| "Email not confirmed" ban on Google sign-up | Supabase requires confirmation | Fixed in code — ensure `SUPABASE_SERVICE_KEY` (service role) is set, not the anon key |
| Posts don't appear for other users | API server not running | Start both workflows; posts now save to MongoDB |
| Friend/follow notifications not received | MongoDB not connected | Set `MONGODB_URI` and `MONGODB_DB` secrets |
| Appeal submission fails | `BREVO_API_KEY` missing | Appeals now save to MongoDB even without Brevo — still returns success |
| "Cannot find package 'esbuild'" | `node_modules` missing | Run `pnpm install` in the workspace root |
| API returns 500 on all routes | Missing env vars | Check all required secrets above are set |

---

## 6. Push to GitHub

1. In Replit, open the **Git** tab (branch icon in sidebar)
2. Or run in Shell:
   ```bash
   git add -A
   git commit -m "Fix: post saving, Google auth, reshare, blocks, appeals"
   git push origin main
   ```
