# Real-Time Supabase Account Status Polling

## Problem
When an admin bans/disables an account on Supabase, the user can still use the app because the client has no way to detect the status change without a full refresh.

## Solution
Implemented a real-time polling system that:
- Checks Supabase account status every 10 seconds
- Detects bans, disables, and other account issues
- Logs out user immediately when account is disabled
- Works without page refresh or significant load

## ✅ Implementation

### Frontend Hook: `useSupabaseStatusPolling`

**Location**: `artifacts/reelsy/src/hooks/useSupabaseStatusPolling.ts`

**How it works**:
1. Polls every 10 seconds (only when user is logged in)
2. Gets current Supabase session
3. Checks for ban status: `banned_until` timestamp
4. Checks for disable flag: `app_metadata.disabled`
5. Checks email confirmation status
6. Validates via backend endpoint for additional verification
7. On detection: clears auth data, logs out user, shows suspension screen

**Performance optimizations**:
- Only runs if user is logged in
- Throttles to 5-second minimum between checks
- Stops polling when user logs out
- Non-blocking async checks
- Catches and skips errors (doesn't spam logs)

**Integration**: Automatically called in `App.tsx` at app startup

### Backend Endpoint: `GET /api/auth/check-supabase-status`

**Location**: `artifacts/api-server/src/routes/auth.ts`

**Purpose**: Server-side validation of Supabase account status

**Query Parameters**:
- `supabaseId` (required): The Supabase user ID

**Response**:
```json
{
  "isDisabled": boolean,
  "reason": "string (optional)",
  "bannedUntil": "ISO8601 timestamp (optional)"
}
```

**Checks performed**:
1. Verifies user exists in Supabase
2. Checks `banned_until` timestamp
3. Checks `app_metadata.disabled` flag
4. Validates email confirmation status
5. Returns disable reason if account is disabled

### Supabase Status Function: `checkSupabaseUserStatus`

**Location**: `artifacts/api-server/src/lib/supabase.ts`

**Uses Supabase admin API** to check:
- User exists and is valid
- Ban status (banned_until)
- Admin disabled flag (app_metadata.disabled)
- Email confirmation status

## 🔄 Data Flow

```
User logs in
    ↓
App.tsx loads → useSupabaseStatusPolling activates
    ↓
Hook runs immediately on load
    ↓
Every 10 seconds:
  - Check Supabase session (local)
  - Check banned_until, app_metadata, email status
  - Validate via backend endpoint
    ↓
Admin bans user on Supabase dashboard
    ↓
Next polling cycle (within 10 seconds):
  - Detects banned_until set to future date
  - OR detects backend validation fails
    ↓
User logged out immediately
  - LocalStorage cleared
  - User state reset
  - Redirected to account-suspended screen
  - No refresh needed
```

## 🔍 Ban Detection Methods

### Method 1: Supabase banned_until
Admin sets ban via Supabase dashboard → `Auth.users.banned_until` is set
- Most reliable method
- Detected by hook on next poll

### Method 2: Disable via app_metadata
Admin sets `app_metadata.disabled = true` via Supabase API
- Alternative disable method
- Also detected by hook

### Method 3: Unconfirm Email
Admin removes email confirmation
- Triggers re-verification workflow
- Detected by hook

## ⚙️ Configuration

### Environment Requirements
- `SUPABASE_SERVICE_KEY`: Must have admin privileges to call `auth.admin.getUserById()`

### Frontend Hook Configuration
Edit `useSupabaseStatusPolling.ts` to adjust:
- Polling interval (default: 10 seconds)
  ```ts
  pollingIntervalRef.current = setInterval(checkSupabaseStatus, 10000); // 10 seconds
  ```

- Throttle time (default: 5 seconds minimum between checks)
  ```ts
  if (now - lastCheckRef.current < 5000) return; // 5 seconds
  ```

## 📊 Performance Impact

### Network
- **1 HTTP request every 10 seconds** (when logged in)
- Minimal payload (~100 bytes response)
- Throttled to prevent burst requests
- Aborted on logout

### CPU
- Minimal processing (simple timestamp/flag checks)
- Runs in background via interval
- No blocking operations

### Memory
- Single `NodeJS.Timeout` reference
- No accumulating data structures

**Estimated**: <100ms per check, ~10 requests/minute per active user

## 🧪 Testing

### Test 1: Ban Detection
1. Open app and log in
2. Go to Supabase dashboard
3. Ban the user (`Auth → Users → Select user → Ban user`)
4. Within 10 seconds, user should be logged out
5. Should see account-suspended screen

### Test 2: Disable via app_metadata
1. Logged in and open app
2. Update Supabase user: set `app_metadata.disabled = true`
3. Within 10 seconds, user should be logged out

### Test 3: Email Unconfirm
1. Logged in and open app
2. Unconfirm user email in Supabase dashboard
3. Within 10 seconds, user should be logged out

### Test 4: Backend Validation
1. Logged in and open app
2. Call: `GET /api/auth/check-supabase-status?supabaseId=<user_id>`
3. Should return correct disabled status

## 📁 Files Created/Modified

**New Files**:
- `artifacts/reelsy/src/hooks/useSupabaseStatusPolling.ts`

**Modified Files**:
- `artifacts/api-server/src/lib/supabase.ts` (added checkSupabaseUserStatus)
- `artifacts/api-server/src/routes/auth.ts` (added check-supabase-status endpoint)
- `artifacts/reelsy/src/App.tsx` (integrated polling hook)

## 🚀 Usage

### In Components
The hook is automatically active when the app loads. No manual integration needed for most use cases.

If you need to manually activate/deactivate polling:
```tsx
// In App.tsx or any component
useSupabaseStatusPolling();
```

The hook automatically:
- Starts when user logs in
- Stops when user logs out
- Cleans up on component unmount

## ⚡ Quick Setup

1. **No configuration needed** - hook works out of the box
2. **Ensure SUPABASE_SERVICE_KEY** is set in backend .env
3. **Deploy changes** to frontend and backend
4. **Test banning** a user to verify polling works

## 🔒 Security Considerations

- Polling uses existing Supabase session (no extra credentials needed)
- Backend endpoint validates via Supabase admin API
- Ban detection is server-authoritative
- No sensitive data leaked in responses
- Rate limiting recommended on backend if needed

## 📈 Future Enhancements

1. **Configurable polling interval** - Make it environment-specific
2. **Telemetry** - Track poll success/failure rates
3. **Exponential backoff** - Reduce polling on repeated failures
4. **Offline support** - Gracefully handle network issues
5. **Toast notifications** - Show reason when logged out
6. **Appeal workflow** - Let users request review after ban

## 🎯 Summary

This implementation provides **real-time account status detection** without requiring page refresh or creating significant load. The 10-second polling interval ensures:
- Users are logged out within seconds of ban
- Minimal network/CPU impact
- Smooth UX with no visible polling
- Server-side validation for security
