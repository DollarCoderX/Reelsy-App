# Reelsy — Function Reference

A complete map of every major feature, hook, component, and API route in the Reelsy codebase.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication & Session](#2-authentication--session)
3. [User Account States](#3-user-account-states)
4. [Core Context — AppContext](#4-core-context--appcontext)
5. [Main App Shell — MainApp.tsx](#5-main-app-shell--mainapptsx)
6. [Home Feed — HomeTab.tsx](#6-home-feed--hometabtsx)
7. [Chat — ChatTab.tsx](#7-chat--chattabtsx)
8. [Settings — SettingsTab.tsx](#8-settings--settingstabtsx)
9. [Bots System](#9-bots-system)
10. [Post Composer](#10-post-composer)
11. [Media Viewer](#11-media-viewer)
12. [Animated Emoji System — LottieEmoji.tsx](#12-animated-emoji-system--lottieemojitsx)
13. [IP & Country Restriction — useIPRestriction.ts](#13-ip--country-restriction--useiprestricitionts)
14. [Supabase Client — supabase-client.ts](#14-supabase-client--supabase-clientts)
15. [API Server Routes](#15-api-server-routes)
16. [Suspension System — suspension.ts](#16-suspension-system--suspensionts)
17. [Security — Email & Domain Checks](#17-security--email--domain-checks)
18. [Background Polling — useSupabaseStatusPolling.ts](#18-background-polling--usesupabasestatuspollingts)
19. [Feature Intro System](#19-feature-intro-system)
20. [Banned User Screen — BannedUser.tsx](#20-banned-user-screen--bannedusertsx)
21. [Account Suspended Screen — AccountSuspended.tsx](#21-account-suspended-screen--accountsuspendedtsx)

---

## 1. Architecture Overview

```
pnpm monorepo
├── artifacts/reelsy/          — React + Vite frontend (TypeScript)
│   ├── src/
│   │   ├── App.tsx            — Root, auth gate, session restore
│   │   ├── context/           — AppContext (global state)
│   │   ├── components/
│   │   │   ├── tabs/          — HomeTab, ChatTab, SettingsTab, ActivityTab
│   │   │   └── ui/            — MediaViewer, LottieEmoji, etc.
│   │   ├── data/bots.ts       — Bot definitions and seed posts
│   │   ├── hooks/             — useIPRestriction, useEngagement, etc.
│   │   └── lib/supabase-client.ts — Supabase auth wrappers
└── artifacts/api-server/      — Express 5 + MongoDB backend
    └── src/
        ├── routes/auth.ts     — Register, login, Google OAuth, ban/suspend
        └── lib/
            ├── suspension.ts  — Suspension logic + Brevo email dispatch
            └── emailCheck.ts  — Disposable/suspicious email detection
```

**Key invariants:**
- All auth state lives in `AppContext` (`user`, `appPhase`, `setUser`, `setAppPhase`).
- Explicit logout sets `localStorage.reelsy_explicitly_logged_out = "1"` to prevent Supabase session re-hydration on refresh.
- `reelsy_user` in localStorage is the persisted session token for all auth providers.

---

## 2. Authentication & Session

### `App.tsx` — `checkAuth()` (runs once on mount)

Priority order:
1. If `AppContext.user` is already set → route to `main`, `banned`, or `account-suspended`.
2. If `sessionStorage[RESTRICTION_STORAGE_KEY]` exists → restore ban/suspension state.
3. If `localStorage.reelsy_user` exists → restore user and route.
4. If `localStorage.reelsy_explicitly_logged_out === "1"` → stop (user deliberately logged out).
5. Otherwise → call `supabase.auth.getSession()`. If a Google OAuth session is found, POST `/api/auth/signin-google` to finish login.

### App Phases (`appPhase`)

| Phase | Screen |
|---|---|
| `splash` | SplashScreen |
| `welcome` | WelcomeScreen |
| `auth-email` | AuthEmail (register via email) |
| `auth-otp` | AuthOTP (email OTP verification) |
| `auth-login` | AuthLogin (existing user login) |
| `auth-country` | AuthCountry (magic-link country selector) |
| `auth-magic` | AuthMagic (magic link sent confirmation) |
| `auth-interests` | AuthInterests (post-OAuth interest selection) |
| `auth-age` | AuthAge (age gate) |
| `main` | MainApp (full app) |
| `banned` | BannedUser |
| `account-suspended` | AccountSuspended |

### Email Registration (`/api/auth/register`)

1. Validate fields (email, password, username, displayName, age, interests).
2. Check email via `checkEmail()` — blocks disposable domains (no strikes added at registration).
3. Hash password with SHA-256.
4. Insert `ReelsyUser` into MongoDB with `strikeCount: 0`, `strikes: []`, `isBanned: false`, `isSuspended: false`.
5. Generate JWT token and return user data.

### Google OAuth (`/api/auth/signin-google`)

1. Verify Supabase `access_token` by calling `supabase.auth.getUser()`.
2. Upsert user in MongoDB (create if new, update if returning).
3. Return JWT + user data.

### Logout

Both `SettingsTab.handleSignOut()` and `BannedUser.handleLogout()`:
```
await supabaseSignOut()              // invalidate Supabase session
localStorage.removeItem('reelsy_user')
localStorage.removeItem('authToken')
localStorage.removeItem('supabaseId')
localStorage.removeItem('reelsy_auth_token')
localStorage.setItem('reelsy_explicitly_logged_out', '1')
setUser(null)
setAppPhase('welcome')
```

---

## 3. User Account States

### Normal User
- `isBanned: false`, `isSuspended: false`
- Routes to `main`

### Suspended User
- `isSuspended: true`
- Routes to `account-suspended`
- Can submit a plea (POST `/api/auth/suspension-review`) which emails `praisejiro43210@gmail.com`
- Plea includes: username, email, message, telemetry (timezone, locale, UA, screen, connection)

### Banned User
- `isBanned: true`
- Routes to `banned`
- Can submit an appeal with evidence (video, images, documents up to 10MB each)
- Can request 30-day re-review cooldown
- Can sync status from server via POST `/api/auth/check-ban`

---

## 4. Core Context — AppContext

**File:** `artifacts/reelsy/src/context/AppContext.tsx`

```ts
interface AppContextType {
  user: ReelsyUser | null
  setUser: (user: ReelsyUser | null) => void
  appPhase: AppPhase
  setAppPhase: (phase: AppPhase) => void
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
  language: AppLanguage
  setLanguage: (lang: AppLanguage) => void
}
```

`ReelsyUser` shape (subset):
- `username`, `nickname`, `email`, `avatar`, `coverImage`
- `isBanned`, `banReason`, `bannedAt`, `bannedUntil`
- `isSuspended`, `suspensionReason`, `suspensionDetails`
- `tier` (`free` | `premium` | `premium+` | `verified`)
- `supabaseId`, `country`

---

## 5. Main App Shell — MainApp.tsx

**File:** `artifacts/reelsy/src/components/MainApp.tsx`

Bottom tab navigation with 4 tabs:
- **Home** (`HomeTab`) — feed, post composer, comments
- **Chat** (`ChatTab`) — DMs with users and bots
- **Activity** (`ActivityTab`) — drafts, post history, analytics
- **Settings** (`SettingsTab`) — profile, preferences, sign-out

Navigation visibility is controlled by `onNavVisible` prop passed to each tab (hides nav when sheets/composers are open).

---

## 6. Home Feed — HomeTab.tsx

**File:** `artifacts/reelsy/src/components/tabs/HomeTab.tsx`

### Feed

- Two feed modes: `foryou` (all posts) and `following` (friend posts).
- Posts are merged from: `BOT_POSTS` (seed data), `userPosts` (localStorage), ad posts (`AD_POST_1`, `AD_POST_2`).
- Infinite scroll via `visibleCount` (loads 10 more on reaching bottom).
- `activeTag` filters posts by hashtag.

### Post Card (`PostCard` component — defined inline)

Features per post:
- Double-tap to like (heart burst animation)
- Like, comment, repost, bookmark counts
- "Not interested" — hides post with 6-second undo countdown
- Report flow (multi-step sheet with animated progress bar)
- Long-press menu (follow, report, not interested, copy link, view seen)
- Media tap → opens `MediaViewer`
- Sponsored ad posts → open `ReelsyAdBrowser` (in-app browser)
- Ad insights → `AdInsightsSheet` with world heatmap

### `handleNewPost(postData)`

1. Sets `isSendingPost = true` (shows animated dotted SVG ring on FAB).
2. After 1.4 s delay: prepends new post to `userPosts`, saves to `localStorage.reelsy_user_posts`.
3. Sets `postSentFlash = true` (FAB turns green with ✓ for 2.2 s).

### FAB States

| State | Appearance |
|---|---|
| Idle | Solid circle with `+` icon |
| Sending | Dotted SVG ring fills clockwise over 1.3 s |
| Sent | Green circle with ✓ for 2.2 s |

### Comment Sheet (`CommentSheet` component — defined inline)

- Displays comments sorted by time.
- Supports emoji reactions via `AnimatedEmojiPicker` (LottieEmoji).
- Sends comments stored locally in `localStorage.reelsy_comments_<postId>`.

### Stories Row

- "Post" button (user's avatar + dotted border + Plus icon) opens `PostComposer`.
- Static story avatars (from `STORIES` array, currently empty by design).

---

## 7. Chat — ChatTab.tsx

**File:** `artifacts/reelsy/src/components/tabs/ChatTab.tsx`

### Conversations

- Bot conversations: `kabil`, `micheal`, `Help-Center` (the 2 autonomous bots + support bot).
- Each bot has seed messages from `BOT_INTRO_MESSAGES`.
- Bot friends are stored in `localStorage[BOT_FRIENDS_STORAGE_KEY]`.

### Bot Auto-messaging

`AUTONOMOUS_BOT_IDS = ["kabil", "micheal"]`

Every `AUTONOMOUS_BOT_POST_INTERVAL_MS` (5 min) while the app is open:
- Pick a random caption from `AUTONOMOUS_BOT_COPY[botId]`.
- Generate an AI image via Pollinations (`https://image.pollinations.ai/prompt/…`).
- Insert as a chat message in the bot's conversation.

### AI Chat Restriction

- AI replies restricted to `AI_ALLOWED_COUNTRIES = ["US", "GB", "CA", "NG"]`.
- Country detection via `useIPRestriction` hook.
- Users outside allowed countries see a "not available in your region" message.

### Real-time (Supabase)

- Messages for human–human chats are stored/subscribed via Supabase Realtime.
- Channel: `chat:<conversationId>` (INSERT events).

---

## 8. Settings — SettingsTab.tsx

**File:** `artifacts/reelsy/src/components/tabs/SettingsTab.tsx`

Sections:
- **Profile card** — avatar, cover image, nickname, username, tier badge
- **Account** — edit profile, verification, password, virtual number
- **Privacy** — data retention, privacy sheet
- **Notifications** — notification preferences sheet
- **Appearance** — theme toggle (dark/light), language selector
- **Subscription** — tier details, upgrade prompt
- **Support** — help center, contact support, terms, rate app
- **Beta Features** — toggle
- **Sign Out** — confirmation dialog → `handleSignOut()`

`handleSignOut()`:
- Signs out of Supabase
- Clears all auth localStorage keys
- Sets `reelsy_explicitly_logged_out = "1"`
- Redirects to `welcome` phase

---

## 9. Bots System

**File:** `artifacts/reelsy/src/data/bots.ts`

### Bot Roster

| ID | Name | Role |
|---|---|---|
| `kabil` | Kabil | Autonomous — posts AI images every 5 min |
| `micheal` | Micheal | Autonomous — posts AI images every 5 min |
| `Help-Center` | Reelsy Help Center | Support bot — non-autonomous |

### Key Exports

| Export | Purpose |
|---|---|
| `BOTS` | Full bot profile array (id, name, avatar, bio, etc.) |
| `BOT_POSTS` | Seed post array for the home feed |
| `AUTONOMOUS_BOT_IDS` | `["kabil", "micheal"]` — bots that auto-post |
| `BOT_INTRO_MESSAGES` | Welcome DMs sent when a bot accepts a friend request |
| `AUTONOMOUS_BOT_POST_INTERVAL_MS` | `300000` (5 minutes) |
| `BOT_FRIENDS_STORAGE_KEY` | `"reelsy_friend_bot_ids"` |
| `addBotFriend(botId)` | Adds bot to friend list in localStorage, dispatches event |
| `getBotById(id)` | Returns bot profile by id |
| `getBotPost(postId)` | Returns seed post by id |

---

## 10. Post Composer

**File:** `artifacts/reelsy/src/components/PostComposer.tsx`

Features:
- Text post with rich tag/mention support
- Image attachment (file picker or camera)
- Video attachment
- AI image generation (Pollinations)
- Location picker
- Music attachment (search + attach)
- Reshare / quote-post support
- Draft auto-save to `localStorage.reelsy_draft`

Props:
```ts
onClose: () => void
onPost: (postData) => void
resharePost?: { authorName, authorHandle, content, media }
```

---

## 11. Media Viewer

**File:** `artifacts/reelsy/src/components/ui/MediaViewer.tsx`

Props:
```ts
media: string | string[]       // single URL or array
type: "image" | "video"
onClose: () => void
initialIndex?: number          // default 0
postCaption?: string           // shown at bottom
authorHandle?: string          // shown in watermark strip
```

Features:
- Multi-image carousel with prev/next arrows
- Double-tap to like
- **Download with watermark** — draws the Reelsy badge + author handle onto a canvas, then triggers browser download as JPEG
  - Falls back to direct link download on CORS failure
  - Download button shows spinner → ✓ animation
- Video: native controls, autoplay, loop, playsInline
- Like and bookmark state (local)

---

## 12. Animated Emoji System — LottieEmoji.tsx

**File:** `artifacts/reelsy/src/components/LottieEmoji.tsx`

### `LottieEmoji` component

```ts
interface LottieEmojiProps {
  name: string              // e.g. "heart", "fire", "laughing"
  size?: number             // default 32
  loop?: boolean
  autoplay?: boolean
  style?: React.CSSProperties
}
```

Renders an animated Lottie emoji from the `EMOJI_MAP` (70+ named entries).

### `AnimatedEmojiPicker` component

```ts
interface AnimatedEmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose?: () => void
}
```

Full-sheet emoji picker with category tabs (Smileys, Gestures, Nature, Objects, etc.). Each emoji animates on hover/tap. Used in the CommentSheet and ChatTab.

### Available Emoji Names (subset)

`heart`, `fire`, `laughing`, `crying`, `shocked`, `star`, `eyes`, `clapping`, `thumbsup`, `thumbsdown`, `waving`, `celebrate`, `cool`, `sleeping`, `angry`, `love`, `thinking`, `rainbow`, `sparkle`, `100`, `muscle`, `pray`, `salute`, `sweat`, `worried`, `robot`, `ghost`, `alien`, `unicorn`, `pizza`, `coffee`, `avocado`, `camera`, `phone`, `globe`, `money`, `trophy`, …

---

## 13. IP & Country Restriction — useIPRestriction.ts

**File:** `artifacts/reelsy/src/hooks/useIPRestriction.ts`

```ts
const { country, isVPN, isAllowed, isAIAllowed } = useIPRestriction()
```

- Detects country via `ipapi.co/json` (with localStorage cache).
- VPN detection via `ipqualityscore.com` (optional key via `VITE_IPQS_KEY`).
- **Magic-link auth countries:** `US`, `GB`, `GH`, `CN`, `FR`, `CA`
- **AI-chat allowed countries:** `US`, `GB`, `CA`, `NG`
- VPN users are blocked from magic link auth.

---

## 14. Supabase Client — supabase-client.ts

**File:** `artifacts/reelsy/src/lib/supabase-client.ts`

| Export | Purpose |
|---|---|
| `supabase` | Supabase JS client instance |
| `signInWithGoogle()` | Clears logout flag, initiates OAuth redirect |
| `signOut()` | Calls `supabase.auth.signOut()` |
| `getSession()` | Returns current session or null |
| `subscribeToMessages(channelId, cb)` | Subscribes to Supabase Realtime chat channel |
| `sendMessageToSupabase(msg)` | Inserts message into `messages` table |

---

## 15. API Server Routes

**Base:** `artifacts/api-server/src/routes/auth.ts`  
All routes prefixed `/api/auth/`

| Method | Path | Description |
|---|---|---|
| `POST` | `/register` | Email registration — hashes password, creates MongoDB user, returns JWT |
| `POST` | `/login` | Email login — verifies password, returns JWT + user |
| `POST` | `/send-otp` | Sends OTP email for verification (Brevo) |
| `POST` | `/verify-otp` | Verifies OTP code, marks email as verified |
| `POST` | `/signin-google` | Completes Google OAuth — upserts MongoDB user |
| `POST` | `/check-ban` | Looks up user by email/supabaseId, returns ban/suspension status |
| `POST` | `/suspension-review` | Receives plea, emails admin, returns confirmation |

---

## 16. Suspension System — suspension.ts

**File:** `artifacts/api-server/src/lib/suspension.ts`

### `sendSuspensionReviewEmail(username, toEmail, reviewData, telemetry)`

Sends a formatted HTML email via Brevo SMTP to `praisejiro43210@gmail.com` when a user submits a suspension plea.

Email includes:
- Username and registered email
- Plea message (or default "User requested account review")
- Suspension reason (from user record)
- Telemetry: timestamp, timezone, locale, user agent, platform, screen resolution, device memory/cores, connection type, online status

Requires: `BREVO_API_KEY` environment variable.

---

## 17. Security — Email & Domain Checks

**File:** `artifacts/api-server/src/lib/emailCheck.ts`

### `checkEmail(email): { allowed: boolean; suspicious: boolean; reason?: string }`

- Blocks known disposable email domains (Mailinator, Guerrilla Mail, TempMail, etc.)
- Returns `suspicious: true` for known throwaway patterns.
- Registration no longer adds strikes for suspicious emails — it only blocks completely disposable ones.

---

## 18. Background Polling — useSupabaseStatusPolling.ts

**File:** `artifacts/reelsy/src/hooks/useSupabaseStatusPolling.ts`

Polls `/api/auth/check-ban` every 60 seconds while the app is open:
- For Google OAuth users: checks Supabase session first.
- For email users: uses stored `authToken`.
- If `isBanned` → redirects to `banned` phase.
- If `isSuspended` → redirects to `account-suspended` phase.
- Updates `user` in context if status changed.

---

## 19. Feature Intro System

**File:** `artifacts/reelsy/src/context/FeatureIntroContext.tsx`

### `useFeatureIntro()`

```ts
const { requestFeatureIntro } = useFeatureIntro()

requestFeatureIntro(
  featureId: string,       // unique key stored in localStorage
  title: string,
  description: string,
  onConfirm: () => void
)
```

Shows a one-time modal the first time a user taps a feature. Stores seen state in `localStorage.reelsy_feature_intro_<featureId>`. After confirmation, calls `onConfirm()`.

Used on: home post FAB, chat AI button, virtual number feature.

---

## 20. Banned User Screen — BannedUser.tsx

**File:** `artifacts/reelsy/src/components/BannedUser.tsx`

A full-screen appeal UI shown when `user.isBanned === true`.

Features:
- View ban reason and date
- Submit an appeal with:
  - Written explanation
  - Video evidence (up to 10 MB)
  - Image evidence (up to 10 MB each, multiple)
  - Document evidence (up to 10 MB)
- Status sync (checks server for updated ban status)
- 30-day re-review cooldown timer
- Theme toggle
- `handleLogout()` — signs out fully, sets explicit-logout flag, returns to welcome

---

## 21. Account Suspended Screen — AccountSuspended.tsx

**File:** `artifacts/reelsy/src/components/AccountSuspended.tsx`

A clean, theme-aware screen shown when `user.isSuspended === true`.

Features:
- Displays suspension reason from `user.suspensionReason`
- "Submit a plea" bottom sheet with free-text message
- Submits to `POST /api/auth/suspension-review`
- Shows success state after submission
- Theme toggle (dark/light)
- `handleLogout()` — signs out fully and redirects to welcome

---

*Last updated: June 2025. Generated from Reelsy source.*
