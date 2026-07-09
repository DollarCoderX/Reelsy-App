---
name: Google OAuth email confirm
description: Must confirm Google OAuth user emails in Supabase to prevent auto-ban
---

# Google OAuth email confirm

## The rule
After creating a new MongoDB user from Google OAuth (`/api/auth/signin-google`), always call `confirmUserEmail(supabaseUser.id)` **after** `ensureSupabaseInitialized()`.

## Why
Supabase's auth system can mark Google OAuth users as "email not confirmed" and then auto-ban or restrict them. Google already verified the email address so it is always safe to confirm immediately. Without this call, users get banned on first Google sign-up.

## How to apply
- In `artifacts/api-server/src/routes/auth.ts`, the signin-google route now does this after `usersCollection.insertOne()`:
  ```typescript
  await ensureSupabaseInitialized();
  await confirmUserEmail(supabaseUser.id);
  ```
- The `confirmUserEmail` function lives in `artifacts/api-server/src/lib/supabase.ts` and calls `auth.admin.updateUserById(uid, { email_confirm: true })`
- Errors are caught and logged as warnings — they must not throw to the caller
