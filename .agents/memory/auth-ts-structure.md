---
name: auth.ts structure
description: Current state of auth.ts after duplicate route cleanup and phone search addition
---

**Rule:** auth.ts had duplicate route registrations from prior bad edits. They are now removed.

**Clean route order (after fix):**
1. POST `/send-otp`
2. POST `/verify-otp`
3. POST `/register`
4. POST `/signin-email`
5. POST `/signin-google`
6. POST `/profile/update` — now also accepts `phone` (stored as digits-only) and `bio` (max 200 chars)
7. POST `/tier/update`
8. GET `/profile/:username` — non-fatal Supabase lookup, tries exact then lowercase match
9. GET `/check-suspension/:username`
10. POST `/suspension-review`
11. GET `/check-supabase-status`
12. POST `/admin/ban-user`
13. POST `/admin/unban-user`
14. GET `/ban-status/:username`
15. POST `/ban-simple`
16. POST `/unban-simple`
17. POST `/send-magic-link`
18. GET `/verify-magic-link`
19. POST `/forgot-password`
20. GET `/search-by-phone` — searches users by phone digits, returns `{ found, username, displayName, profileImage }`

**Why:** Previous edits using regex replacement with `$&` corrupted the file and duplicated all routes. Python surgery removed duplicates at lines 616-676.
