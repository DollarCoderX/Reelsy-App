**✅ Updated Backend Architecture Document**  
**For React Web Frontend (Web-First Approach)**

---

**REELSY BACKEND ARCHITECTURE DOCUMENT**  
**For Web Frontend Integration**  
**Version 1.1** | May 2026

### 1. Project Context
- **Current Stage**: Plain React Web (Vite/React)
- **Future Plan**: Convert to Android (likely using Capacitor or similar)
- **Goal**: Build clean, scalable APIs and realtime connections that work well on web first.

---

### 2. Backend Services Overview

| Service                | Purpose                                      | Key Responsibility for Web Frontend |
|------------------------|----------------------------------------------|-------------------------------------|
| **Supabase and brevo**           | Authentication (Email(brevo) + Google(supabase))              | Auth, Session Management |
| **MongoDB Atlas**      | Main Database                                | All data fetching & mutations |
| **PocketBase**         | Realtime Chat + Chains                       | Realtime subscriptions |
| **Cloudflare R2**      | Media Storage (Images & Videos)              | Upload + serving media |
| **RevenueCat**         | Payments & Subscriptions                     | Subscription status |
| **Firebase**           | Push Notifications (Web + future Android)    | FCM / Web Push |

---

### 3. Authentication Flow

1. User logs in via **Supabase and brevo** (Email / Google OAuth).
2. On success, frontend receives Supabase for google or email otp from brevo session.
3. Frontend immediately sends request to backend to create/sync user profile in **MongoDB Atlas**.
4. Store user data (including `@username`) .

**Frontend must prepare:**
- Auth Context / Provider
- Protected Routes
- Username availability check during signup

---

### 4. Core Data Models (Frontend Needs These)

**User**
- `id`, `supabaseId`, `username`, `displayName`, `avatarUrl`, `bio`
- `isPremium`, `isPremiumPlus`, `ghostModeEnabled`
- `createdAt`

**Moment (Post)**
- `id`, `userId`, `text`, `mediaUrl`, `mediaType` (image/video)
- `expiresAt`, `allowReshare`, `isAnonymous`
- `likeCount`, `commentCount`, `viewCount`, `createdAt`

**Chat & Chain**
- Realtime via PocketBase
- Persistent history in MongoDB

---

### 5. Key Features & What Frontend Should Prepare

**Home Feed**
- Infinite scroll + pagination
- Personalized feed from backend
- **Expiration Timer** (countdown per post)
- Pull to refresh

**Posting Flow**
- Media upload → get signed URL from backend → upload to Cloudflare R2
- Save moment metadata
- Show success with expiration info

**Chat System**
- Realtime using PocketBase WebSocket
- Message sending with optimistic updates
- Typing indicators

**Activity Tab**
- User’s own moments with live countdowns
- Interactions (likes, comments, views)

**Befriend System**
- Send / Accept friend requests
- Mutual Friends display

**VPN Policy**
- we will change the ip all countries can use reelsy but reelsy detects vpn and blocks user using vpn with a warning some features use ip address because not all countries can use the features