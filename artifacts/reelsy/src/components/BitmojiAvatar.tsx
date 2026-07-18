/**
 * BitmojiAvatar — Snapchat Bitmoji-style avatar system for Reelsy.
 *
 * The avatar is used ONLY for sending animated sticker messages in DMs.
 * It is NOT a profile picture. Users build a character once, then send it
 * as mood-sticker cards in conversations.
 *
 * Architecture:
 *  - BitmojiBuilder: full-screen character customizer (accessed from DM sticker picker)
 *  - BitmojiStickerSheet: grid of mood stickers (shown in the DM picker "My Bitmoji" tab)
 *  - BitmojiStickerMessage: renders a received bitmoji sticker in the chat bubble
 *  - useBitmojiConfig: localStorage hook to persist the character config
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ChevronLeft, Sparkles, Edit3, RefreshCw } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BitmojiConfig {
  // DiceBear avataaars params
  skinColor: string;       // hex e.g. "FDDCB5"
  hairStyle: string;       // e.g. "shortHair" 
  hairColor: string;       // hex e.g. "2C1B18"
  facialHair: string;      // e.g. "blank" | "beardLight"
  accessories: string;     // e.g. "blank" | "sunglasses"
  clothes: string;         // e.g. "hoodie"
  clotheColor: string;     // e.g. "3C4F5C"
  eyeType: string;         // e.g. "default"
  eyebrowType: string;     // e.g. "default"
  mouthType: string;       // e.g. "default"
  background: string;      // hex e.g. "b6e3f4"
}

export const DEFAULT_CONFIG: BitmojiConfig = {
  skinColor: "FDDCB5",
  hairStyle: "shortHairShortFlat",
  hairColor: "2C1B18",
  facialHair: "blank",
  accessories: "blank",
  clothes: "hoodie",
  clotheColor: "3C4F5C",
  eyeType: "default",
  eyebrowType: "defaultNatural",
  mouthType: "smile",
  background: "b6e3f4",
};

// ── localStorage hook ─────────────────────────────────────────────────────────
const STORAGE_KEY = "reelsy_bitmoji_config";

export function useBitmojiConfig() {
  const [config, setConfigState] = useState<BitmojiConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const saveConfig = useCallback((cfg: BitmojiConfig) => {
    setConfigState(cfg);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  }, []);

  const hasCustomConfig = localStorage.getItem(STORAGE_KEY) !== null;

  return { config, saveConfig, hasCustomConfig };
}

// ── Avatar URL builder ────────────────────────────────────────────────────────
export function buildBitmojiUrl(cfg: BitmojiConfig, overrides: Partial<Record<string, string>> = {}): string {
  const params = new URLSearchParams({
    seed: `bitmoji-${cfg.skinColor}-${cfg.hairStyle}`,
    backgroundColor: overrides.bg ?? cfg.background,
    skinColor: cfg.skinColor,
    hairColor: cfg.hairColor,
    top: overrides.top ?? cfg.hairStyle,
    accessories: cfg.accessories === "blank" ? "" : cfg.accessories,
    facialHair: cfg.facialHair === "blank" ? "" : cfg.facialHair,
    clothe: cfg.clothes,
    clotheColor: cfg.clotheColor,
    eyes: overrides.eyes ?? cfg.eyeType,
    eyebrow: cfg.eyebrowType,
    mouth: overrides.mouth ?? cfg.mouthType,
    accessoriesColor: "transparent",
  });
  return `https://api.dicebear.com/7.x/avataaars/svg?${params.toString()}`;
}

// ── Mood sticker definitions ──────────────────────────────────────────────────
export const MOOD_STICKERS = [
  { id: "lol",      label: "LOL 😂",      emoji: "😂", mouth: "laugh",       eyes: "squint",         bg: "FFF9C4" },
  { id: "love",     label: "Love ❤️",     emoji: "❤️", mouth: "smile",        eyes: "hearts",         bg: "FCE4EC" },
  { id: "hype",     label: "Hype 🔥",     emoji: "🔥", mouth: "smile",        eyes: "winkWacky",      bg: "FFF3E0" },
  { id: "wink",     label: "Wink 😉",     emoji: "😉", mouth: "twinkle",      eyes: "wink",           bg: "E8F5E9" },
  { id: "cool",     label: "Cool 😎",     emoji: "😎", mouth: "serious",      eyes: "default",        bg: "E3F2FD" },
  { id: "wow",      label: "Wow 🤩",      emoji: "🤩", mouth: "disbelief",    eyes: "stars",          bg: "EDE7F6" },
  { id: "bye",      label: "Bye 👋",      emoji: "👋", mouth: "smile",        eyes: "default",        bg: "E0F7FA" },
  { id: "no",       label: "No Way 🙅",   emoji: "🙅", mouth: "grimace",      eyes: "eyeRoll",        bg: "FBE9E7" },
  { id: "cry",      label: "RIP 😭",      emoji: "😭", mouth: "sad",          eyes: "cry",            bg: "E8EAF6" },
  { id: "fire",     label: "Fire 💯",     emoji: "💯", mouth: "smile",        eyes: "happy",          bg: "FFF8E1" },
  { id: "sleep",    label: "Sleepy 😴",   emoji: "😴", mouth: "default",      eyes: "closed",         bg: "E8EAF6" },
  { id: "think",    label: "Hmm 🤔",      emoji: "🤔", mouth: "default",      eyes: "default",        bg: "F3E5F5" },
  { id: "gg",       label: "GG 🏆",       emoji: "🏆", mouth: "smile",        eyes: "happy",          bg: "FFFDE7" },
  { id: "nope",     label: "Nope 😑",     emoji: "😑", mouth: "disbelief",    eyes: "roll",           bg: "EFEBE9" },
  { id: "vibe",     label: "Vibe ✨",     emoji: "✨", mouth: "smile",        eyes: "happy",          bg: "EDE7F6" },
  { id: "shock",    label: "OMG 😱",      emoji: "😱", mouth: "screaming",    eyes: "surprised",      bg: "FFEBEE" },
];

/** Encodes a bitmoji sticker into a chat message string */
export function encodeBitmojiSticker(config: BitmojiConfig, moodId: string): string {
  return `[BITMOJI:${moodId}:${JSON.stringify(config)}]`;
}

/** Decodes a bitmoji sticker message string, returns null if not a bitmoji message */
export function decodeBitmojiSticker(text: string): { mood: typeof MOOD_STICKERS[0]; config: BitmojiConfig } | null {
  const m = text.match(/^\[BITMOJI:([^:]+):(.+)\]$/s);
  if (!m) return null;
  const mood = MOOD_STICKERS.find((s) => s.id === m[1]);
  if (!mood) return null;
  try {
    const config = JSON.parse(m[2]) as BitmojiConfig;
    return { mood, config };
  } catch {
    return null;
  }
}

// ── BitmojiStickerMessage — renders a received sticker in the chat ─────────────
interface BitmojiStickerMessageProps {
  text: string;
  isMine: boolean;
}

export const BitmojiStickerMessage = ({ text, isMine }: BitmojiStickerMessageProps) => {
  const sticker = decodeBitmojiSticker(text);
  if (!sticker) return null;
  const { mood, config } = sticker;
  const url = buildBitmojiUrl(config, { mouth: mood.mouth, eyes: mood.eyes, bg: mood.bg });

  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      className={`flex flex-col items-${isMine ? "end" : "start"} gap-1`}
    >
      <div
        className="w-28 h-28 rounded-3xl overflow-hidden shadow-lg flex items-center justify-center border-2 border-background/50"
        style={{ backgroundColor: `#${mood.bg}` }}
      >
        <img src={url} alt={mood.label} className="w-full h-full" />
      </div>
      <span className="text-[11px] font-semibold text-muted-foreground px-1">{mood.label}</span>
    </motion.div>
  );
};

// ── BitmojiStickerSheet — shown in EmojiStickerPicker "My Bitmoji" tab ─────────
interface BitmojiStickerSheetProps {
  config: BitmojiConfig;
  onSelect: (text: string) => void;
  onEditAvatar: () => void;
}

export const BitmojiStickerSheet = ({ config, onSelect, onEditAvatar }: BitmojiStickerSheetProps) => {
  return (
    <div className="h-full flex flex-col">
      {/* Edit button */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-secondary/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full overflow-hidden bg-secondary/50">
            <img src={buildBitmojiUrl(config)} alt="My Bitmoji" className="w-full h-full" />
          </div>
          <span className="text-[12px] font-bold">My Bitmoji</span>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onEditAvatar}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/60 text-[11px] font-semibold">
          <Edit3 className="w-3 h-3" /> Edit
        </motion.button>
      </div>
      {/* Sticker grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-4 gap-2 p-2">
          {MOOD_STICKERS.map((mood) => {
            const url = buildBitmojiUrl(config, { mouth: mood.mouth, eyes: mood.eyes, bg: mood.bg });
            return (
              <motion.button
                key={mood.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => onSelect(encodeBitmojiSticker(config, mood.id))}
                className="flex flex-col items-center gap-1 p-1.5 rounded-2xl bg-secondary/30 hover:bg-secondary/60 transition-colors active:scale-90"
              >
                <div
                  className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: `#${mood.bg}` }}
                >
                  <img src={url} alt={mood.label} className="w-full h-full" />
                </div>
                <span className="text-[9px] font-semibold text-muted-foreground text-center leading-tight truncate w-full">
                  {mood.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Option data ───────────────────────────────────────────────────────────────
const SKIN_OPTIONS = [
  { label: "Light",       value: "FDDCB5", color: "#FDDCB5" },
  { label: "Med. Light",  value: "EDB98A", color: "#EDB98A" },
  { label: "Medium",      value: "D08B5B", color: "#D08B5B" },
  { label: "Med. Dark",   value: "AE5D29", color: "#AE5D29" },
  { label: "Dark",        value: "614335", color: "#614335" },
];

const HAIR_OPTIONS = [
  { label: "Flat",        value: "shortHairShortFlat" },
  { label: "Wave",        value: "shortHairShortWaved" },
  { label: "Curly",       value: "shortHairShortCurly" },
  { label: "Long",        value: "longHairStraight" },
  { label: "Curly Long",  value: "longHairCurly" },
  { label: "Bob",         value: "longHairBob" },
  { label: "Bun",         value: "longHairBun" },
  { label: "Bald",        value: "noHair" },
  { label: "Dreads",      value: "longHairDreads" },
  { label: "Afro",        value: "shortHairFrizzle" },
  { label: "Big Afro",    value: "shortHairBigHair" },
  { label: "Mohawk",      value: "shortHairFrizzle" },
];

const HAIR_COLORS = [
  { label: "Black",  value: "2C1B18", color: "#2C1B18" },
  { label: "Brown",  value: "4A312C", color: "#4A312C" },
  { label: "Auburn", value: "A55728", color: "#A55728" },
  { label: "Blonde", value: "B58143", color: "#B58143" },
  { label: "Red",    value: "C93305", color: "#C93305" },
  { label: "Gray",   value: "929598", color: "#929598" },
  { label: "White",  value: "ECDCBF", color: "#ECDCBF" },
  { label: "Blue",   value: "0D3349", color: "#0D3349" },
  { label: "Pink",   value: "F59797", color: "#F59797" },
  { label: "Purple", value: "582381", color: "#582381" },
];

const OUTFIT_OPTIONS = [
  { label: "Hoodie",   value: "hoodie",            emoji: "🧥" },
  { label: "Collar",   value: "collarSweater",      emoji: "👔" },
  { label: "T-Shirt",  value: "graphicShirt",       emoji: "👕" },
  { label: "Blazer",   value: "blazerShirt",        emoji: "🤵" },
  { label: "Stripe",   value: "stripeShirt",        emoji: "🎽" },
  { label: "Overall",  value: "overall",            emoji: "👗" },
];

const OUTFIT_COLORS = [
  { label: "Navy",    value: "3C4F5C", color: "#3C4F5C" },
  { label: "Gray",    value: "929598", color: "#929598" },
  { label: "Black",   value: "262E33", color: "#262E33" },
  { label: "Red",     value: "CB1414", color: "#CB1414" },
  { label: "Blue",    value: "65C9FF", color: "#65C9FF" },
  { label: "Green",   value: "A7D379", color: "#A7D379" },
  { label: "Pink",    value: "FC909F", color: "#FC909F" },
  { label: "Purple",  value: "B1E2FF", color: "#B1E2FF" },
];

const EYE_OPTIONS = [
  { label: "Default",  value: "default" },
  { label: "Happy",    value: "happy" },
  { label: "Wink",     value: "wink" },
  { label: "Sleepy",   value: "closed" },
  { label: "Side",     value: "side" },
  { label: "Surprised",value: "surprised" },
];

const MOUTH_OPTIONS = [
  { label: "Smile",     value: "smile" },
  { label: "Twinkle",   value: "twinkle" },
  { label: "Serious",   value: "serious" },
  { label: "Disbelief", value: "disbelief" },
  { label: "Sad",       value: "sad" },
  { label: "Tongue",    value: "tongue" },
];

const ACCESSORY_OPTIONS = [
  { label: "None",     value: "blank" },
  { label: "Sunnies",  value: "sunglasses" },
  { label: "Round",    value: "roundGlasses" },
  { label: "Retro",    value: "prescription01" },
  { label: "Clear",    value: "prescription02" },
];

const BG_OPTIONS = [
  { label: "Sky",    value: "b6e3f4" },
  { label: "Lavender",value: "c0aede" },
  { label: "Peach",  value: "ffdfbf" },
  { label: "Mint",   value: "d1f4cc" },
  { label: "Pink",   value: "ffd5e5" },
  { label: "Yellow", value: "fff3b0" },
  { label: "Dark",   value: "1a1a2e" },
];

const TABS = ["Face", "Hair", "Outfit", "Eyes", "BG"] as const;
type BuilderTab = typeof TABS[number];

// ── BitmojiBuilder — full-screen character builder ────────────────────────────
interface BitmojiBuilderProps {
  initialConfig: BitmojiConfig;
  onSave: (cfg: BitmojiConfig) => void;
  onClose: () => void;
}

export const BitmojiBuilder = ({ initialConfig, onSave, onClose }: BitmojiBuilderProps) => {
  const [cfg, setCfg] = useState<BitmojiConfig>(initialConfig);
  const [tab, setTab] = useState<BuilderTab>("Face");
  const [saved, setSaved] = useState(false);

  const previewUrl = buildBitmojiUrl(cfg);

  const update = (patch: Partial<BitmojiConfig>) => setCfg((c) => ({ ...c, ...patch }));

  const handleSave = () => {
    onSave(cfg);
    setSaved(true);
    setTimeout(onClose, 700);
  };

  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col"
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <X className="w-4 h-4" />
        </motion.button>
        <p className="font-bold text-[15px] flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-violet-400" /> My Bitmoji
        </p>
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-[12px] font-bold">
          {saved ? <Check className="w-3.5 h-3.5" /> : null}
          {saved ? "Saved!" : "Save"}
        </motion.button>
      </div>

      {/* Avatar preview */}
      <div className="shrink-0 flex justify-center py-3">
        <div className="relative">
          <div
            className="w-32 h-32 rounded-full overflow-hidden border-4 border-background shadow-2xl"
            style={{ backgroundColor: `#${cfg.background}` }}
          >
            <img src={previewUrl} alt="Your Bitmoji" className="w-full h-full" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center border-2 border-background">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      {/* Mood preview strip */}
      <div className="shrink-0 px-4 pb-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Sticker Preview</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {MOOD_STICKERS.slice(0, 8).map((mood) => {
            const url = buildBitmojiUrl(cfg, { mouth: mood.mouth, eyes: mood.eyes, bg: mood.bg });
            return (
              <div key={mood.id} className="shrink-0 flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-2xl overflow-hidden" style={{ backgroundColor: `#${mood.bg}` }}>
                  <img src={url} alt={mood.label} className="w-full h-full" />
                </div>
                <span className="text-[8px] font-medium text-muted-foreground">{mood.emoji}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 flex gap-1 px-4 pb-2 overflow-x-auto no-scrollbar border-t border-secondary/30 pt-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`shrink-0 px-4 py-2 rounded-full text-[12px] font-bold transition-all ${tab === t ? "bg-foreground text-background" : "bg-secondary/50 text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Options */}
      <div className="flex-1 overflow-y-auto px-4 pb-10">
        {tab === "Face" && (
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Skin Tone</p>
              <div className="flex gap-3 flex-wrap">
                {SKIN_OPTIONS.map((s) => (
                  <button key={s.value} onClick={() => update({ skinColor: s.value })}
                    className={`flex flex-col items-center gap-1 transition-all ${cfg.skinColor === s.value ? "scale-110" : ""}`}>
                    <div className={`w-10 h-10 rounded-full border-4 transition-all ${cfg.skinColor === s.value ? "border-foreground" : "border-transparent"}`}
                      style={{ backgroundColor: s.color }} />
                    <span className="text-[9px] text-muted-foreground font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Mouth</p>
              <div className="grid grid-cols-3 gap-2">
                {MOUTH_OPTIONS.map((m) => (
                  <button key={m.value} onClick={() => update({ mouthType: m.value })}
                    className={`py-2.5 rounded-2xl text-[12px] font-semibold transition-all ${cfg.mouthType === m.value ? "ring-2 ring-foreground bg-secondary/50" : "bg-secondary/30 text-muted-foreground"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "Hair" && (
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Style</p>
              <div className="grid grid-cols-3 gap-2">
                {HAIR_OPTIONS.map((h) => (
                  <button key={h.value} onClick={() => update({ hairStyle: h.value })}
                    className={`py-2.5 rounded-2xl text-[12px] font-semibold transition-all ${cfg.hairStyle === h.value ? "ring-2 ring-foreground bg-secondary/50" : "bg-secondary/30 text-muted-foreground"}`}>
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Color</p>
              <div className="grid grid-cols-5 gap-2">
                {HAIR_COLORS.map((c) => (
                  <button key={c.value} onClick={() => update({ hairColor: c.value })}
                    className={`flex flex-col items-center gap-1 transition-all ${cfg.hairColor === c.value ? "scale-110" : ""}`}>
                    <div className={`w-10 h-10 rounded-full border-4 transition-all ${cfg.hairColor === c.value ? "border-foreground" : "border-transparent"}`}
                      style={{ backgroundColor: c.color }} />
                    <span className="text-[9px] text-muted-foreground font-medium">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "Outfit" && (
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Style</p>
              <div className="grid grid-cols-3 gap-3">
                {OUTFIT_OPTIONS.map((o) => (
                  <button key={o.value} onClick={() => update({ clothes: o.value })}
                    className={`flex flex-col items-center gap-2 py-3 rounded-2xl transition-all ${cfg.clothes === o.value ? "ring-2 ring-foreground bg-secondary/50" : "bg-secondary/30"}`}>
                    <span className="text-2xl">{o.emoji}</span>
                    <span className="text-[11px] font-semibold text-muted-foreground">{o.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Color</p>
              <div className="grid grid-cols-4 gap-2">
                {OUTFIT_COLORS.map((c) => (
                  <button key={c.value} onClick={() => update({ clotheColor: c.value })}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all ${cfg.clotheColor === c.value ? "ring-2 ring-foreground bg-secondary/40" : ""}`}>
                    <div className="w-10 h-10 rounded-2xl border border-secondary" style={{ backgroundColor: c.color }} />
                    <span className="text-[9px] font-medium text-muted-foreground">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Accessories</p>
              <div className="grid grid-cols-3 gap-2">
                {ACCESSORY_OPTIONS.map((a) => (
                  <button key={a.value} onClick={() => update({ accessories: a.value })}
                    className={`py-2.5 rounded-2xl text-[12px] font-semibold transition-all ${cfg.accessories === a.value ? "ring-2 ring-foreground bg-secondary/50" : "bg-secondary/30 text-muted-foreground"}`}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "Eyes" && (
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Eye Style</p>
              <div className="grid grid-cols-3 gap-2">
                {EYE_OPTIONS.map((e) => (
                  <button key={e.value} onClick={() => update({ eyeType: e.value })}
                    className={`py-2.5 rounded-2xl text-[12px] font-semibold transition-all ${cfg.eyeType === e.value ? "ring-2 ring-foreground bg-secondary/50" : "bg-secondary/30 text-muted-foreground"}`}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "BG" && (
          <div className="pt-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Background Color</p>
            <div className="grid grid-cols-4 gap-3">
              {BG_OPTIONS.map((b) => (
                <button key={b.value} onClick={() => update({ background: b.value })}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all ${cfg.background === b.value ? "ring-2 ring-foreground" : ""}`}>
                  <div className="w-14 h-14 rounded-2xl border border-secondary" style={{ backgroundColor: `#${b.value}` }} />
                  <span className="text-[10px] font-semibold text-muted-foreground">{b.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default BitmojiBuilder;
