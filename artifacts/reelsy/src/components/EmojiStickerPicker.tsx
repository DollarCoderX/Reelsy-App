/**
 * EmojiStickerPicker — WhatsApp-style emoji & sticker panel for DMs.
 * Tab 1: Emoji categories (Unicode, no external API needed)
 * Tab 2: Sticker packs (fun illustrated stickers via free Giphy stickers fallback to built-in)
 * Pro users get a "My Stickers" tab for custom avatar stickers.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile, Star, Zap, Heart, Coffee, Globe, Search } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

// ── Emoji data ──────────────────────────────────────────────────────────────
const EMOJI_CATEGORIES = [
  {
    label: "Smileys",
    icon: "😊",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","😟","🙁","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿"],
  },
  {
    label: "People",
    icon: "👋",
    emojis: ["👋","🤚","🖐","✋","🖖","👌","🤌","🤏","✌","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🙏","✍","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🫀","🫁","🧠","🦷","🦴","👀","👁","👅","👄","💋","🩸","👶","🧒","👦","👧","🧑","👱","👨","🧔","👩","🧓","👴","👵","🙍","🙎","🙅","🙆","💁","🙋","🧏","🙇","🤦","🤷","💆","💇","🚶","🧍","🧎","🏃","💃","🕺","🧖","🧗","🏌","🏄","🚴","🤸","🤽","🤾","🤺","🏊","🚵","🧘"],
  },
  {
    label: "Animals",
    icon: "🐶",
    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🦣","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐈","🐓","🦃","🦤","🦚","🦜","🦢","🦩","🕊","🐇","🦝","🦨","🦡","🦦","🦥","🐁","🐀","🐿","🦔"],
  },
  {
    label: "Food",
    icon: "🍕",
    emojis: ["🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶","🫑","🌽","🥕","🧄","🧅","🥔","🍠","🫘","🥜","🌰","🍞","🥐","🥖","🫓","🥨","🥯","🥞","🧇","🧀","🍖","🍗","🥩","🥓","🌭","🍔","🍟","🍕","🫔","🌮","🌯","🥗","🥘","🫕","🥫","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥮","🍢","🧆","🥚","🍳","🥘","🧈","🥞","🧇","☕","🍵","🫖","🍺","🍻","🥂","🍷","🫗","🍸","🍹","🧉","🍾","🧃","🥤","🧋","🧊","🥄","🍴","🍽","🥢"],
  },
  {
    label: "Travel",
    icon: "✈️",
    emojis: ["🌍","🌎","🌏","🗺","🧭","🏔","⛰","🌋","🗻","🏕","🏖","🏜","🏝","🏞","🏟","🏛","🏗","🧱","🏘","🏚","🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","🏯","🏰","💒","🗼","🗽","⛪","🕌","🛕","🕍","⛩","🕋","⛲","⛺","🌁","🌃","🏙","🌄","🌅","🌆","🌇","🌉","🎠","🎡","🎢","💈","🎪","🚂","🚃","🚄","🚅","🚆","🚇","🚈","🚉","🚊","🚝","🚞","🚋","🚌","🚍","🚎","🚐","🚑","🚒","🚓","🚔","🚕","🚖","🚗","🚘","🚙","🛻","🚚","🚛","🚜","🏎","🏍","🛵","✈","🛩","🛫","🛬","⛵","🚤","🛥","🛳","⛴","🚢"],
  },
  {
    label: "Activities",
    icon: "⚽",
    emojis: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🏓","🏸","🏒","🏑","🥍","🏏","🪃","🥅","⛳","🪁","🏹","🎣","🤿","🥊","🥋","🛹","🛼","🛷","⛸","🥌","🎿","⛷","🏂","🪂","🏋","🤼","🤸","🤺","🏇","⛹","🤾","🏌","🏄","🚵","🚴","🏆","🥇","🥈","🥉","🏅","🎖","🏵","🎗","🎫","🎟","🎪","🤹","🎭","🩰","🎨","🎬","🎤","🎧","🎼","🎵","🎶","🪗","🥁","🪘","🎷","🎺","🎸","🎻","🎲","♟","🎯","🎳","🎮","🎰","🧩"],
  },
  {
    label: "Objects",
    icon: "💡",
    emojis: ["💡","🔦","🕯","🪔","💰","💳","💸","💵","💴","💶","💷","💎","⚖","🧲","🔧","🪛","🔨","⛏","🪚","🪤","🗜","🪣","🔩","🪛","🔑","🗝","🔐","🔒","🔓","🔏","🪞","🪟","🛋","🛏","🛁","🪠","🪑","🚽","🪤","🪣","🧴","🧷","🧹","🧺","🧻","🧼","🪥","🪒","🧽","🪜","🛒","🚪","🪴","🪆","🖼","🪞","📱","💻","⌨","🖥","🖨","🖱","🖲","💽","💾","💿","📀","📷","📸","📹","🎥","📽","🎞","📞","☎","📟","📠","📺","📻","🧭","⏱","⏲","⏰","🕰","⌛","⏳","📡","🔋","🔌","💡","🔦","🕯","🗑","🪣","💊","💉","🩺","🩻","🩼","🦯","🦺"],
  },
  {
    label: "Symbols",
    icon: "❤️",
    emojis: ["❤","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣","💕","💞","💓","💗","💖","💝","💘","💟","☮","✝","☪","🕉","☸","✡","🔯","🪯","☯","☦","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛","🉑","☢","☣","📴","📳","🈶","🈚","🈸","🈺","🈷","✴","🆚","💮","🉐","㊙","㊗","🈴","🈵","🈹","🈲","🅰","🅱","🆎","🆑","🅾","🆘","❌","⭕","🛑","⛔","📛","🚫","💯","💢","♨","🚷","🚯","🚳","🚱","🔞","📵","🚭","❗","❕","❓","❔","‼","⁉","🔅","🔆","〽","⚠","🚸","🔱","⚜","🔰","♻","✅","🈯","💹","❇","✳","❎","🌐","💠","Ⓜ","🌀","💤","🏧","🚾","♿","🅿","🛗","🈳","🈂","🛂","🛃","🛄","🛅","🚹","🚺","🚼","⚧","🚻","🚮","🎦","📶","🈁","🔣","ℹ","🔤","🔡","🔠","🆖","🆗","🆙","🆒","🆕","🆓","0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟","🔢","⏏","▶","⏩","⏭","⏯","◀","⏪","⏮","🔼","⏫","🔽","⏬","⏸","⏹","⏺","🎦","🔅","🔆","📶","📳","📴","♀","♂","⚕","♾","♻","⚜","🔱","📛","🔰","⭕","✅","☑","✔","❎","➕","➖","➗","✖","🟰","💲","💱","™","©","®","〰","➰","➿","🔚","🔙","🔛","🔝","🔜","🔃","🔄","🔙","🔛","🔜"],
  },
];

// ── Built-in sticker packs ──────────────────────────────────────────────────
// These are emoji + label combos — displayed as large "sticker" tiles
const STICKER_PACKS = [
  {
    name: "Vibes",
    stickers: [
      { emoji: "🔥", label: "Fire" },
      { emoji: "💯", label: "100%" },
      { emoji: "👑", label: "King" },
      { emoji: "⚡", label: "Energy" },
      { emoji: "🎉", label: "Party" },
      { emoji: "🫶", label: "Love" },
      { emoji: "😤", label: "Serious" },
      { emoji: "🥶", label: "Ice" },
      { emoji: "🌊", label: "Wave" },
      { emoji: "✨", label: "Sparkle" },
      { emoji: "🎯", label: "Focused" },
      { emoji: "💪", label: "Strong" },
      { emoji: "🧠", label: "Big Brain" },
      { emoji: "🌙", label: "Night" },
      { emoji: "☀️", label: "Shine" },
      { emoji: "🎶", label: "Music" },
    ],
  },
  {
    name: "Feels",
    stickers: [
      { emoji: "🥺", label: "Please" },
      { emoji: "😭", label: "Crying" },
      { emoji: "😂", label: "LOL" },
      { emoji: "🤣", label: "Dead" },
      { emoji: "😍", label: "Love It" },
      { emoji: "🥰", label: "Sweet" },
      { emoji: "😎", label: "Cool" },
      { emoji: "🤯", label: "Mind Blown" },
      { emoji: "😬", label: "Yikes" },
      { emoji: "🤦", label: "Facepalm" },
      { emoji: "🤷", label: "Idk" },
      { emoji: "🙃", label: "Fine" },
      { emoji: "😏", label: "Smirk" },
      { emoji: "🤫", label: "Shh" },
      { emoji: "😴", label: "Sleepy" },
      { emoji: "🥳", label: "Celebrate" },
    ],
  },
  {
    name: "Reactions",
    stickers: [
      { emoji: "👍", label: "Yes!" },
      { emoji: "👎", label: "No" },
      { emoji: "👀", label: "Watching" },
      { emoji: "🙌", label: "Yess" },
      { emoji: "👏", label: "Clap" },
      { emoji: "🫡", label: "Salute" },
      { emoji: "🤝", label: "Deal" },
      { emoji: "🫂", label: "Hug" },
      { emoji: "💀", label: "Dead" },
      { emoji: "😭✋", label: "Stop" },
      { emoji: "⏰", label: "Time?" },
      { emoji: "💬", label: "Talk" },
      { emoji: "❤️‍🔥", label: "Burning" },
      { emoji: "🫠", label: "Melting" },
      { emoji: "🤌", label: "Chef Kiss" },
      { emoji: "🙏", label: "Please" },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────
interface EmojiStickerPickerProps {
  onSelect: (content: string, type: "emoji" | "sticker") => void;
  onClose: () => void;
}

export const EmojiStickerPicker = ({ onSelect, onClose }: EmojiStickerPickerProps) => {
  const { tier } = useAppContext();
  const [tab, setTab] = useState<"emoji" | "stickers">("emoji");
  const [emojiCat, setEmojiCat] = useState(0);
  const [stickerPack, setStickerPack] = useState(0);
  const [emojiSearch, setEmojiSearch] = useState("");

  const filteredEmojis = emojiSearch.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((e) => e.includes(emojiSearch))
    : EMOJI_CATEGORIES[emojiCat]?.emojis ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-background border border-secondary/60 rounded-3xl shadow-2xl overflow-hidden"
      style={{ height: 300 }}
    >
      {/* Tab bar */}
      <div className="flex items-center border-b border-secondary/40 px-3 pt-2 gap-1">
        <button
          onClick={() => setTab("emoji")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-bold transition-all ${tab === "emoji" ? "bg-foreground text-background" : "text-muted-foreground"}`}
        >
          <Smile className="w-3.5 h-3.5" /> Emoji
        </button>
        <button
          onClick={() => setTab("stickers")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-bold transition-all ${tab === "stickers" ? "bg-foreground text-background" : "text-muted-foreground"}`}
        >
          <Star className="w-3.5 h-3.5" /> Stickers
        </button>
        <div className="flex-1" />
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-secondary/60 flex items-center justify-center">
          <span className="text-[12px] text-muted-foreground font-bold">✕</span>
        </button>
      </div>

      {tab === "emoji" && (
        <div className="flex flex-col h-full">
          {/* Search + category row */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-secondary/30">
            <div className="flex items-center gap-1 flex-1 bg-secondary/40 rounded-full px-2.5 py-1">
              <Search className="w-3 h-3 text-muted-foreground shrink-0" />
              <input
                value={emojiSearch}
                onChange={(e) => setEmojiSearch(e.target.value)}
                placeholder="Search emoji…"
                className="bg-transparent text-[12px] outline-none flex-1 font-medium"
                style={{ fontSize: 12 }}
              />
            </div>
            {!emojiSearch && (
              <div className="flex gap-0.5 overflow-x-auto no-scrollbar">
                {EMOJI_CATEGORIES.map((cat, i) => (
                  <button
                    key={i}
                    onClick={() => setEmojiCat(i)}
                    className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[14px] transition-all ${emojiCat === i ? "bg-secondary" : ""}`}
                    title={cat.label}
                  >
                    {cat.icon}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Emoji grid */}
          <div className="flex-1 overflow-y-auto px-2 py-1">
            <div className="grid grid-cols-8 gap-0.5">
              {filteredEmojis.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => { onSelect(emoji, "emoji"); onClose(); }}
                  className="w-8 h-8 flex items-center justify-center text-[20px] hover:bg-secondary/60 rounded-xl transition-colors active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "stickers" && (
        <div className="flex flex-col h-full">
          {/* Pack tabs */}
          <div className="flex gap-1 px-2 py-1.5 border-b border-secondary/30 overflow-x-auto no-scrollbar">
            {STICKER_PACKS.map((pack, i) => (
              <button
                key={i}
                onClick={() => setStickerPack(i)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${stickerPack === i ? "bg-foreground text-background" : "bg-secondary/50 text-muted-foreground"}`}
              >
                {pack.name}
              </button>
            ))}
          </div>
          {/* Sticker grid */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            <div className="grid grid-cols-4 gap-2">
              {STICKER_PACKS[stickerPack]?.stickers.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { onSelect(s.emoji, "sticker"); onClose(); }}
                  className="flex flex-col items-center gap-1 p-2 rounded-2xl bg-secondary/30 hover:bg-secondary/60 transition-all active:scale-90"
                >
                  <span className="text-[32px] leading-none">{s.emoji}</span>
                  <span className="text-[9px] font-semibold text-muted-foreground truncate w-full text-center">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default EmojiStickerPicker;
