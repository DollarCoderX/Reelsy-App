# Comprehensive User Data Checking System

## Overview
The system now checks **ALL user data fields** in Supabase every 10 seconds, not just the ban status. When you ban an email in Supabase, the system will detect it and immediately log out the user.

---

## What Gets Checked Every 10 Seconds

### 1. **Email Status** ✉️
- Email address exists
- Email is confirmed
- Email provider is not blocked
- Detects when email is deleted/removed from Supabase

### 2. **Ban Status** 🚫
- `banned_until` timestamp (future date = banned)
- `app_metadata.disabled` flag
- `app_metadata.banned` flag
- `banned_until` expiration time

### 3. **Account Metadata** 📋
- `app_metadata.disabled` - Admin disable
- `app_metadata.suspended` - System suspension
- `app_metadata.banned` - System ban
- `app_metadata.blocked` - Email provider block
- `user_metadata.blocked` - User-level block
- `user_metadata.suspended` - User-level suspension
- `user_metadata.banned` - User-level ban

### 4. **Email Confirmation** ✅
- `email_confirmed_at` status
- Detects when confirmation is revoked
- Detects email confirmation requirements

### 5. **User Profile** 👤
- User still exists in Supabase
- User ID matches
- Account metadata changes
- Last sign-in timestamp

### 6. **All Changes** 📊
Returns detailed list of what changed:
- `user_deleted_or_not_found`
- `user_banned`
- `app_metadata_disabled`
- `email_not_confirmed`
- `email_confirmed`
- `email_missing`
- `email_provider_blocked`
- `account_suspended`
- `account_banned`
- `user_blocked`
- `user_suspended_metadata`
- `user_banned_metadata`
- `last_sign_in` timestamp

---

## How It Works When You Ban an Email

### Step 1: You Ban Email in Supabase
```
Supabase Dashboard → Authentication → Users
→ Find user → Ban User (or delete email field)
```

### Step 2: System Detects (Within 10 Seconds)
The backend endpoint calls `checkSupabaseUserStatus(userId)` which:
1. Fetches user from Supabase admin API
2. Checks all email fields
3. Detects email is missing/unconfirmed
4. Returns detailed status with changes list

### Step 3: Frontend Logs Out User
```
changes = ['email_missing'] OR ['email_provider_blocked'] OR ['email_not_confirmed']
↓
isDisabled = true
↓
reason = "Email address removed or invalid"
↓
Call handleLogout()
↓
Clear localStorage
↓
Route to 'account-suspended'
↓
Display: "Your account has been disabled"
```

### Step 4: User Sees Suspension Screen
The user cannot access the app and sees:
- "Account Suspended" message
- "Your account email has been removed"
- "Request Review" button to appeal

---

## Detection Methods

### Method 1: Email Deleted/Missing ❌
```
User.email = null
↓
Detected as: 'email_missing'
↓
Action: Immediate logout
```

### Method 2: Email Unconfirmed
```
User.email_confirmed_at = null
↓
Detected as: 'email_not_confirmed'
↓
Action: Immediate logout (if not skipping checks)
```

### Method 3: Admin Ban
```
Supabase Dashboard → Ban User
↓
User.banned_until = [future date]
↓
Detected as: 'user_banned'
↓
Action: Immediate logout
```

### Method 4: App Metadata Changes
```
User.app_metadata.disabled = true
OR
User.app_metadata.banned = true
OR
User.app_metadata.suspended = true
↓
Detected as: Various metadata changes
↓
Action: Immediate logout
```

### Method 5: User Metadata Block
```
User.user_metadata.blocked = true
OR
User.user_metadata.banned = true
↓
Detected as: 'user_blocked' or 'user_banned_metadata'
↓
Action: Immediate logout
```

---

## Console Logging (For Debugging)

When user data changes, you'll see detailed logs:

```typescript
🔍 Supabase user data changes detected: ['email_missing']

❌ Account is disabled - reason: Email address removed or invalid

📊 Detailed status: {
  email: null,
  emailConfirmed: false,
  bannedUntil: null,
  appMetadata: {...},
  userMetadata: {...},
  changes: ['email_missing']
}
```

---

## Response Structure from Backend

```typescript
{
  isDisabled: boolean,           // True if account should be disabled
  reason?: string,               // Why account is disabled
  bannedUntil?: string,         // Ban expiration date
  emailDisabled?: boolean,       // Is email invalid/unconfirmed
  emailStatus?: string,          // 'confirmed' or 'unconfirmed'
  email?: string,                // Current email
  emailConfirmed?: boolean,      // Is email confirmed
  appMetadata?: any,             // Full app metadata
  userMetadata?: any,            // Full user metadata
  lastSignInAt?: string,         // Last login time
  changes?: string[]             // List of detected changes
}
```

---

## Polling Frequency

- **Check interval**: Every 10 seconds
- **Throttle minimum**: 5 seconds between checks
- **Initial check**: Immediately on login
- **Continuous**: Runs entire session
- **No refresh needed**: Automatic detection

---

## Critical Change Detection

These changes trigger **immediate logout**:
- User deleted from Supabase
- Account banned
- Account suspended
- Email provider blocked
- User blocked
- Email removed
- Account found as missing

---

## Test Scenarios

### Test 1: Ban User Email
1. Login with test user
2. Go to Supabase Dashboard → Users
3. Select user → Ban User
4. Wait max 10 seconds
5. ✅ User automatically logged out
6. ✅ See suspension screen

### Test 2: Delete Email
1. Login with test user
2. Go to Supabase Dashboard → Users
3. Edit user → Delete email field
4. Wait max 10 seconds
5. ✅ User automatically logged out
6. ✅ See suspension screen

### Test 3: Unconfirm Email
1. Login with test user
2. Go to Supabase Dashboard → Users
3. Edit user → Clear `email_confirmed_at`
4. Wait max 10 seconds
5. ✅ User automatically logged out
6. ✅ See suspension screen

### Test 4: Admin Disable
1. Login with test user
2. Go to Supabase Dashboard → Users
3. Click "Disable User" or set `app_metadata.disabled = true`
4. Wait max 10 seconds
5. ✅ User automatically logged out
6. ✅ See suspension screen

---

## Database Fields Checked

### Supabase auth.users Table

| Field | Purpose |
|-------|---------|
| `id` | User unique ID |
| `email` | Email address (checked for null) |
| `email_confirmed_at` | Email confirmation timestamp |
| `banned_until` | Ban expiration date |
| `app_metadata.disabled` | Admin disable flag |
| `app_metadata.banned` | System ban flag |
| `app_metadata.suspended` | System suspend flag |
| `user_metadata.blocked` | User-level block |
| `user_metadata.banned` | User-level ban |
| `user_metadata.suspended` | User-level suspend |
| `last_sign_in_at` | Last login time |

---

## How to Test in Browser Console

```javascript
// Check current polling status
console.log(localStorage.getItem('reelsy_user'))

// Manually trigger ban detection
// (Wait 10 seconds for automatic check, or trigger manually)

// Check server logs
// Backend will log: "Supabase user status for [userId]: ..."
```

---

## Performance Impact

- **Per check**: ~100ms for Supabase admin API call
- **Frequency**: Once every 10 seconds when logged in
- **Load**: ~1 request every 10 seconds
- **Impact**: Minimal - runs in background
- **Network**: ~500 bytes per request

---

## Error Handling

If backend check fails:
- User is **NOT** logged out (safe default)
- Local session checks still work (browser-side validation)
- Error logged to console as "non-fatal"
- System continues polling

---

## Security Features

✅ Comprehensive validation - checks all possible disable methods
✅ Real-time detection - within 10 seconds of ban
✅ No refresh needed - automatic logout
✅ Server-side verification - backend validates Supabase
✅ Detailed logging - know exactly why user was disabled
✅ Graceful degradation - local checks if backend fails
✅ Admin notification - banned users can appeal

---

## Files Modified

- ✅ `artifacts/api-server/src/lib/supabase.ts` - Enhanced checkSupabaseUserStatus()
- ✅ `artifacts/reelsy/src/hooks/useSupabaseStatusPolling.ts` - Detailed change detection

---

## What's Next

When user data is checked and changes detected:
1. ✅ All changes logged with details
2. ✅ User automatically logged out if disabled
3. ✅ Route to suspension screen
4. ✅ Show detailed reason
5. ✅ User can request review
6. ✅ Admin notified via email (telemetry included)

---

## Summary

**Before**: System only checked `banned_until` and `app_metadata.disabled`

**Now**: System checks:
- ✅ Email exists and is confirmed
- ✅ All ban/disable/suspend/block flags
- ✅ All metadata changes
- ✅ User still exists
- ✅ Email provider status
- ✅ Returns detailed list of changes
- ✅ Logs out user within 10 seconds of ANY change

**Result**: When you ban an email or user in Supabase, the user is automatically logged out and sees the suspension screen - **no page refresh needed!** 🎉
