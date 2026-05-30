# TODO

## Investigation / Plan
- [x] Identify likely lag sources by scanning for timers/intervals and heavy UI updates.
- [x] Locate the main suspected culprit: `HomeTab.tsx` runs a 1-second localStorage sync interval causing re-renders.
- [x] Review `HomeTab.tsx`, `ChatTab.tsx`, `SearchTab.tsx`, `AppContext.tsx` for additional periodic updates/animations.

## Fixes to implement (next)
- [x] Replace the `useState(() => { setInterval(...) })` polling in `HomeTab.tsx` with a proper `useEffect` (and remove 1s polling loop). 

- [ ] Sync user posts via event-driven approach (e.g., `storage` event) or at least throttle the polling.
- [ ] Prevent state updates when the `reelsy_user_posts` JSON hasn’t changed (compare IDs/serialized hash).
- [ ] (Optional) Reduce re-render impact in the feed by memoizing `PostCard` and/or limiting re-renders.
- [ ] (Optional) Add lazy-loading / pause offscreen videos.

