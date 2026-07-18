---
name: Bitmoji sticker system
description: How the Bitmoji avatar sticker system works in Reelsy DMs
---

**Rule:** Avatar is for DM stickers ONLY — not a profile picture.

**Architecture:**
- `BitmojiAvatar.tsx` — all types, builder, sticker sheet, sticker message renderer
- `useBitmojiConfig()` — localStorage hook, key `reelsy_bitmoji_config`
- `buildBitmojiUrl(config, overrides)` — DiceBear avataaars SVG URL builder
- `MOOD_STICKERS` — 16 moods (lol, love, hype, wink, cool, wow, bye, no, cry, fire, sleep, think, gg, nope, vibe, shock)
- `encodeBitmojiSticker(config, moodId)` → `[BITMOJI:moodId:JSON]`
- `decodeBitmojiSticker(text)` → `{ mood, config } | null`
- `BitmojiStickerMessage` — renders received sticker in chat bubble (140px avatar + label)
- `BitmojiStickerSheet` — grid of 16 mood stickers in EmojiStickerPicker "Bitmoji" tab
- `BitmojiBuilder` — full-screen character builder (5 tabs: Face, Hair, Outfit, Eyes, BG)

**EmojiStickerPicker integration:**
- Third tab "Bitmoji" added next to Emoji and Stickers
- Tapping a sticker calls `onSelect(text, "sticker")` which sends `[BITMOJI:...]` as the message

**RealDmView integration:**
- Each message is checked via `decodeBitmojiSticker(msg.content)`
- If decoded, renders `<BitmojiStickerMessage>` instead of a text bubble
