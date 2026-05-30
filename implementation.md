Reelsy Enhancements - Implementation Plan
This implementation plan outlines the steps to fulfill the 15 enhancements and bug fixes requested in final.md.

User Review Required
IMPORTANT

Reelsy AI Replacement: The current "Reelsy AI" tab (cortex) will be completely replaced by the new Activity Tab, which displays images, videos, saved posts, memories, and drafts.
Navigator Re-ordering: Navigator re-ordering via long-press is restricted to premium, premium+, and gold users. Free users will see an aesthetic premium upsell dialog when attempting to customize.
Full Screen Onboarding: Onboarding for desktop/laptop users will now occupy the full viewport rather than being letterboxed in a small centered card with black borders.
Proposed Changes
1. Main Navigation and Framework Polish
[MODIFY] 
App.tsx
Modify onboarding layout for desktop so it occupies the full viewport instead of a centered card with a black background.
Ensure onboarding and main app transitions are smooth.
[MODIFY] 
use-mobile.tsx
Initialize the state synchronously to window.innerWidth < 768 (client-side) to eliminate the layout shift/glitch on mobile loading.
[MODIFY] 
MainApp.tsx
Replace the Reelsy AI tab (cortex) with the new Activity tab (activity) using a Flame icon.
Implement layout re-ordering for Premium, Premium+, and Gold users:
Add long-press handlers to the navigator icons.
When a long-press (800ms) occurs on a premium tier, display "Customize Navigator Enabled" above the nav bar.
Implement dragging to change the tab order (using Framer Motion's <Reorder.Group> and <Reorder.Item>).
Save the new order to localStorage on release and fade out the message.
For free users, show a neat popup prompt suggesting upgrade to Premium.
2. Activity Tab (Reelsy AI Replacement)
[NEW] 
ActivityTab.tsx
Build a gorgeous new tab containing 5 sub-sections:
Pic: Displays image posts created by the user or bookmarked.
Video: Displays video posts created by the user or bookmarked.
Save: Displays saved/bookmarked posts.
Memory: Features a time-travel Snapchat-style memory card (e.g. "1 Year Ago Today...", "6 Months Ago...") showing nostalgic images and posts.
Draft: Displays saved drafts where users can edit/open or delete them.
[DELETE] 
ReelsyAI.tsx
Remove the old Reelsy AI tab and MovieRoom code completely.
3. Home Feed Enhancements (Not Interested, Report, Comments, and Shining Loader)
[MODIFY] 
HomeTab.tsx
Not Interested: When tapped, render a beautiful toast popup saying "Reelsy will show less of this context" that displays for 6 seconds with a countdown progress indicator, then fades away while hiding the card.
Report Post:
Add line loading animation: When the user submits a report, show a shimmering line loader with a percentage indicator progressing: 1% -> 6% -> 90% -> 100% before transitioning to the "Report submitted" screen.
"Other" input field: If the user selects "Other" in the list of report reasons, morph the row into an interactive text input.
Comment Section:
Fade navigation bar: Trigger onNavVisible(false) when comments open and onNavVisible(true) when they close.
Smile emoji / Send button toggler: If input text is empty, display a Smile button. Tapping it displays a popup with 5 animated emojis: "❤️", "😂", "😭", "🔥", "🥺". Tapping an emoji posts it instantly with custom animation. If text is entered, morph the button into a right send arrow.
Likes and replies: Support comment liking and nested replies.
User avatar: Display the user's customized avatar on their comment bubbles.
Shining Line Loader: When refreshing or tapping "New posts", run a glowing scanner line animation across the top of the feed for 2 seconds.
For You vs Friends: Filter posts so "For You" contains public posts (everyone), and "Friends" contains posts from active friends (online bots, user friends, and "Friends" audience posts).
Triple Tap Friends: If the user triple-taps the "Friends" tab toggle in under 800ms, trigger a gorgeous emoji rain of 30-50 colorful emojis falling down the screen.
4. Post Composer & Hashtags
[MODIFY] 
PostComposer.tsx
Add 30+ popular hashtags to TRENDING_TAGS and TAGS.
Rotate text input placeholders automatically every 5 seconds.
Fix Music Search: Change proxy URL to relative /api/music/search to avoid port/CORS mismatch.
Auto Music Select: Detect //song name// syntax in text. Query it, select the first match automatically, set selectedMusic, and strip the query syntax from the composer input.
Draft Audience: When audience is set to "Draft", update the button label to "Draft", show a loading animation "Drafting...", and save to drafts local storage instead of posting.
5. Chat Enhancements
[MODIFY] 
ChatTab.tsx
Reelsy Official Chat: Replace input controls with a clean banner: "You can't message this chat but receive messages". Disable calling.
Help Center Bot: Revamp the @help agent chat to support rich Telegram-style interactive menus (Faq buttons, contact details, upgrade shortcuts) inside the chat flow.
Chat Wallpaper: Add a premium wallpaper picker supporting:
2 Solid colors (Default background + Slate background).
6 Unsplash vertical imagery options.
A custom media selector. If user is Premium+, they can choose a custom video (up to 10s) which loops in the chat background. Otherwise, allow custom images.
Reelsy Bot V5:
Integrate Reelsy Bot search queries: Typing "Reelsy Bot" or "ReelsyBot" renders it in results.
Tapping Reelsy Bot adds it to the active threads and opens the chat.
Hide voice/video call buttons and image/audio input buttons for Reelsy Bot.
Instead of + button, render a .menu button. Tapping it sends .menu to the bot, which instantly replies with the ReelsyBot V5 ASCII text menu.
Implement full interactive mock parsing for commands: .ping, .alive, .owner, .stats, .runtime, .calculate, .coin, .imagine (returns a nice mock picture), etc.
[MODIFY] 
SearchTab.tsx
Enable search for group chats. Display search results for group chats with a badge "Anyone can join".
Support opening Reelsy Bot or group chats from search results, which switches navigation to the Chat tab and focuses the selected chat.
Verification Plan
Automated Verification
Run typecheck: pnpm --filter @workspace/reelsy run typecheck to verify TypeScript compile-time safety.
Verify building: pnpm --filter @workspace/reelsy run build to confirm Vite production bundle completeness.
Manual Verification
Deploy to the preview server and test:
Long-press navigator as a Premium user to re-order tabs, verify persistence.
Verify full screen onboarding on desktop and absence of mobile layout shifts.
Search "Reelsy Bot" and test all V5 bot commands, especially .menu and game commands.
Compose a draft post, open the Activity tab, and verify it appears in "Draft" and can be reopened.
Test comment emoji picker animations, comment replies, and likes.
Double-tap and triple-tap gesture behaviors.