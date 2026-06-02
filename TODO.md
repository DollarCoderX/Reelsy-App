# TODO - Reelsy fixes

- [ ] Update `artifacts/reelsy/index.html` to remove “built on Replit” wording (meta/OG/twitter).
- [ ] Implement History API navigation so mobile back button returns to previous in-app UI.
  - [ ] Update `artifacts/reelsy/src/components/MainApp.tsx` to manage/persist UI state in `history.state` and restore on `popstate`.
  - [ ] Update `artifacts/reelsy/src/components/tabs/ChatTab.tsx` to push history state when opening/closing a thread.
- [ ] Replace `artifacts/reelsy/public/favicon.svg` with Reelsy logo.
- [ ] Test manually: back button on mobile from thread->thread list and tab navigation.

