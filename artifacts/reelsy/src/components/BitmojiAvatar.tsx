/**
 * BitmojiAvatar — Bitmoji-style full-body avatar system for Reelsy.
 *
 * Uses DiceBear "avataaars" style — the same Snapchat/Bitmoji-inspired
 * cartoon avatar library, with rich face, hair, outfit, and accessory options.
 *
 * Used for sending sticker messages in DMs. NOT the profile picture.
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Sparkles, Edit3 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BitmojiConfig {
  skinColor: string;    // light|yellow|tanned|dark|brown|darkBrown|black
  top: string;          // hair style (see TOP_OPTIONS)
  hairColor: string;    // auburn|black|blonde|blonde01|brown|brown01|pastelPink|platinum|red|silverGray
  eyes: string;         // close|cry|default|dizzy|eyeRoll|happy|hearts|side|squint|surprised|twinkling|wink|winkWacky|xDizzy
  eyebrow: string;      // angryNatural|default|defaultNatural|flatNatural|raisedExcited|sadConcerned|unibrowNatural|upDown
  mouth: string;        // concerned|default|disbelief|eating|grimace|sad|scream|screamOpen|serious|smile|tongue|twinkle|vomit
  facialHair: string;   // blank|beardLight|beardMajestic|beardMedium|moustacheFancy|moustacheMagnum
  clotheType: string;   // blazerShirt|collarSweater|graphicShirt|hoodie|overall|shirtCrewNeck|shirtVNeck
  clotheColor: string;  // black|blue01|gray01|heather|pastelBlue|pastelGreen|pastelOrange|pastelRed|pastelYellow|pink|red|white
  accessories: string;  // blank|kurt|prescription01|prescription02|round|sunglasses|wayfarers
  background: string;   // hex without #
}

export const DEFAULT_CONFIG: BitmojiConfig = {
  skinColor: "light",
  top: "shortHairShortFlat",
  hairColor: "brown",
  eyes: "default",
  eyebrow: "default",
  mouth: "smile",
  facialHair: "blank",
  clotheType: "hoodie",
  clotheColor: "pastelBlue",
  accessories: "blank",
  background: "b6e3f4",
};

// ── localStorage hook ─────────────────────────────────────────────────────────
const STORAGE_KEY = "reelsy_bitmoji_config";

export function useBitmojiConfig() {
  const [config, setConfigState] = useState<BitmojiConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return DEFAULT_CONFIG;
      const parsed = JSON.parse(stored);
      // Migrate from old adventurer-style config to avataaars
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        // If stored with old adventurer keys, remap sensibly
        top: parsed.top ?? parsed.hairStyle ?? DEFAULT_CONFIG.top,
        hairColor: parsed.hairColor ?? "brown",
        eyes: parsed.eyes ?? parsed.eyeType ?? "default",
        mouth: parsed.mouth ?? parsed.mouthType ?? "smile",
        eyebrow: parsed.eyebrow ?? "default",
        facialHair: parsed.facialHair ?? "blank",
        clotheType: parsed.clotheType ?? "hoodie",
        clotheColor: parsed.clotheColor ?? "pastelBlue",
        accessories: parsed.accessories ?? parsed.glasses ?? "blank",
        background: parsed.background ?? "b6e3f4",
      };
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

// ── Avatar URL builder — DiceBear Avataaars (Snapchat/Bitmoji style) ──────────
export function buildBitmojiUrl(
  cfg: BitmojiConfig,
  overrides: Partial<{ eyes: string; mouth: string; eyebrow: string; bg: string }> = {}
): string {
  const params = new URLSearchParams({
    backgroundColor: overrides.bg ?? cfg.background,
    skinColor: cfg.skinColor,
    top: cfg.top,
    hairColor: cfg.hairColor,
    facialHair: cfg.facialHair,
    clotheType: cfg.clotheType,
    clotheColor: cfg.clotheColor,
    accessories: cfg.accessories,
    eyes: overrides.eyes ?? cfg.eyes,
    eyebrow: overrides.eyebrow ?? cfg.eyebrow,
    mouth: overrides.mouth ?? cfg.mouth,
  });
  return `https://api.dicebear.com/9.x/avataaars/svg?${params.toString()}`;
}

// ── Mood sticker definitions ──────────────────────────────────────────────────
export const MOOD_STICKERS = [
  { id: "lol",    label: "LOL 😂",     emoji: "😂", mouth: "tongue",     eyes: "happy",      eyebrow: "raisedExcited",        bg: "FFF9C4" },
  { id: "love",   label: "Love ❤️",    emoji: "❤️", mouth: "smile",      eyes: "hearts",     eyebrow: "default",              bg: "FCE4EC" },
  { id: "hype",   label: "Hype 🔥",    emoji: "🔥", mouth: "twinkle",   eyes: "surprised",  eyebrow: "raisedExcited",        bg: "FFF3E0" },
  { id: "wink",   label: "Wink 😉",    emoji: "😉", mouth: "smile",      eyes: "wink",       eyebrow: "default",              bg: "E8F5E9" },
  { id: "cool",   label: "Cool 😎",    emoji: "😎", mouth: "smile",      eyes: "squint",     eyebrow: "flatNatural",          bg: "E3F2FD" },
  { id: "wow",    label: "Wow 🤩",     emoji: "🤩", mouth: "screamOpen", eyes: "surprised",  eyebrow: "raisedExcited",        bg: "EDE7F6" },
  { id: "bye",    label: "Bye 👋",     emoji: "👋", mouth: "smile",      eyes: "twinkling",  eyebrow: "raisedExcitedNatural", bg: "E0F7FA" },
  { id: "no",     label: "No Way 🙅",  emoji: "🙅", mouth: "grimace",    eyes: "eyeRoll",    eyebrow: "angryNatural",         bg: "FBE9E7" },
  { id: "cry",    label: "RIP 😭",     emoji: "😭", mouth: "sad",        eyes: "cry",        eyebrow: "sadConcernedNatural",  bg: "E8EAF6" },
  { id: "vibe",   label: "Vibe ✨",    emoji: "✨", mouth: "twinkle",   eyes: "twinkling",  eyebrow: "raisedExcitedNatural", bg: "EDE7F6" },
  { id: "sleep",  label: "Sleepy 😴",  emoji: "😴", mouth: "default",    eyes: "close",      eyebrow: "flatNatural",          bg: "E8EAF6" },
  { id: "think",  label: "Hmm 🤔",     emoji: "🤔", mouth: "default",    eyes: "side",       eyebrow: "upDownNatural",        bg: "F3E5F5" },
  { id: "gg",     label: "GG 🏆",      emoji: "🏆", mouth: "smile",      eyes: "happy",      eyebrow: "raisedExcited",        bg: "FFFDE7" },
  { id: "nope",   label: "Nope 😑",    emoji: "😑", mouth: "serious",    eyes: "default",    eyebrow: "flatNatural",          bg: "EFEBE9" },
  { id: "dizzy",  label: "Dizzy 😵",   emoji: "😵", mouth: "disbelief",  eyes: "dizzy",      eyebrow: "upDown",               bg: "FFEBEE" },
  { id: "shock",  label: "OMG 😱",     emoji: "😱", mouth: "screamOpen", eyes: "xDizzy",     eyebrow: "raisedExcited",        bg: "FFF8E1" },
];

/** Encodes a bitmoji sticker into a chat message string */
export function encodeBitmojiSticker(config: BitmojiConfig, moodId: string): string {
  return `[BITMOJI:${moodId}:${JSON.stringify(config)}]`;
}

/** Decodes a bitmoji sticker message string, returns null if not a bitmoji message */
export function decodeBitmojiSticker(text: string): { mood: (typeof MOOD_STICKERS)[0]; config: BitmojiConfig } | null {
  const m = text.match(/^\[BITMOJI:([^:]+):(.+)\]$/s);
  if (!m) return null;
  const mood = MOOD_STICKERS.find((s) => s.id === m[1]);
  if (!mood) return null;
  try {
    const raw = JSON.parse(m[2]);
    // Migrate old adventurer config to avataaars
    const config: BitmojiConfig = {
      ...DEFAULT_CONFIG,
      ...raw,
      top: raw.top ?? raw.hairStyle ?? DEFAULT_CONFIG.top,
      hairColor: raw.hairColor ?? "brown",
      eyes: raw.eyes ?? raw.eyeType ?? "default",
      mouth: raw.mouth ?? raw.mouthType ?? "smile",
      eyebrow: raw.eyebrow ?? "default",
      facialHair: raw.facialHair ?? "blank",
      clotheType: raw.clotheType ?? "hoodie",
      clotheColor: raw.clotheColor ?? "pastelBlue",
      accessories: raw.accessories ?? raw.glasses ?? "blank",
      background: raw.background ?? "b6e3f4",
    };
    return { mood, config };
  } catch {
    return null;
  }
}

// ── BitmojiStickerMessage — renders a received sticker in chat ────────────────
interface BitmojiStickerMessageProps { text: string; isMine: boolean; }

export const BitmojiStickerMessage = ({ text, isMine }: BitmojiStickerMessageProps) => {
  const sticker = decodeBitmojiSticker(text);
  if (!sticker) return null;
  const { mood, config } = sticker;
  const url = buildBitmojiUrl(config, { mouth: mood.mouth, eyes: mood.eyes, eyebrow: mood.eyebrow, bg: mood.bg });
  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      className={`flex flex-col items-${isMine ? "end" : "start"} gap-1`}
    >
      <div
        className="w-32 h-32 rounded-3xl overflow-hidden shadow-lg border-2 border-background/50"
        style={{ backgroundColor: `#${mood.bg}` }}
      >
        <img src={url} alt={mood.label} className="w-full h-full object-contain" />
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

export const BitmojiStickerSheet = ({ config, onSelect, onEditAvatar }: BitmojiStickerSheetProps) => (
  <div className="h-full flex flex-col">
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-secondary/30">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary/50">
          <img src={buildBitmojiUrl(config)} alt="My Bitmoji" className="w-full h-full object-contain" />
        </div>
        <span className="text-[12px] font-bold">My Bitmoji</span>
      </div>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onEditAvatar}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/60 text-[11px] font-semibold"
      >
        <Edit3 className="w-3 h-3" /> Edit
      </motion.button>
    </div>
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-4 gap-2 p-2">
        {MOOD_STICKERS.map((mood) => {
          const url = buildBitmojiUrl(config, { mouth: mood.mouth, eyes: mood.eyes, eyebrow: mood.eyebrow, bg: mood.bg });
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
                <img src={url} alt={mood.label} className="w-full h-full object-contain" />
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

// ── Avatar option data ────────────────────────────────────────────────────────

const SKIN_OPTIONS = [
  { label: "Light",      value: "light",     color: "#FDDCB5" },
  { label: "Med Light",  value: "yellow",    color: "#F5CFA0" },
  { label: "Tan",        value: "tanned",    color: "#E8B88A" },
  { label: "Brown",      value: "brown",     color: "#C68642" },
  { label: "Dark Brown", value: "darkBrown", color: "#8D5524" },
  { label: "Dark",       value: "dark",      color: "#594539" },
  { label: "Black",      value: "black",     color: "#3C2414" },
];

const TOP_OPTIONS = [
  { label: "Short Flat",   value: "shortHairShortFlat" },
  { label: "Short Round",  value: "shortHairShortRound" },
  { label: "Short Curly",  value: "shortHairShortCurly" },
  { label: "Short Waved",  value: "shortHairShortWaved" },
  { label: "Caesar",       value: "shortHairTheCaesar" },
  { label: "Caesar Side",  value: "shortHairTheCaesarSidePart" },
  { label: "Sides",        value: "shortHairSides" },
  { label: "Frizzle",      value: "shortHairFrizzle" },
  { label: "Dreads",       value: "shortHairDreads01" },
  { label: "Dreads 2",     value: "shortHairDreads02" },
  { label: "Mullet",       value: "shortHairShaggyMullet" },
  { label: "Long Straight",value: "longHairStraight" },
  { label: "Long Wavy",    value: "longHairCurvy" },
  { label: "Long Curly",   value: "longHairCurly" },
  { label: "Big Hair",     value: "longHairBigHair" },
  { label: "Bob",          value: "longHairBob" },
  { label: "Bun",          value: "longHairBun" },
  { label: "Dreads Long",  value: "longHairDreads" },
  { label: "Fro",          value: "longHairFro" },
  { label: "Fro Band",     value: "longHairFroBand" },
  { label: "Not Too Long", value: "longHairNotTooLong" },
  { label: "MIA",          value: "longHairMiaWallace" },
  { label: "Shaved Sides", value: "longHairShavedSides" },
  { label: "Hat",          value: "hat" },
  { label: "Hijab",        value: "hijab" },
  { label: "Turban",       value: "turban" },
  { label: "Winter Hat",   value: "winterHat1" },
];

const HAIR_COLOR_OPTIONS = [
  { label: "Black",      value: "black",      color: "#2c1b18" },
  { label: "Brown",      value: "brown",      color: "#a52a2a" },
  { label: "Light Brn",  value: "brown01",    color: "#b5794d" },
  { label: "Auburn",     value: "auburn",     color: "#a0522d" },
  { label: "Blonde",     value: "blonde",     color: "#f5ca63" },
  { label: "Blonde 2",   value: "blonde01",   color: "#d4a800" },
  { label: "Red",        value: "red",        color: "#cc3300" },
  { label: "Silver",     value: "silverGray", color: "#9e9e9e" },
  { label: "Platinum",   value: "platinum",   color: "#f5f5f5" },
  { label: "Pastel Pink",value: "pastelPink", color: "#f4c2c2" },
];

const EYES_OPTIONS = [
  { label: "Default",    value: "default" },
  { label: "Happy",      value: "happy" },
  { label: "Squint",     value: "squint" },
  { label: "Wink",       value: "wink" },
  { label: "Twinkling",  value: "twinkling" },
  { label: "Hearts",     value: "hearts" },
  { label: "Side",       value: "side" },
  { label: "Surprised",  value: "surprised" },
  { label: "Eye Roll",   value: "eyeRoll" },
  { label: "Dizzy",      value: "dizzy" },
  { label: "Cry",        value: "cry" },
  { label: "Close",      value: "close" },
  { label: "Wink Wacky", value: "winkWacky" },
  { label: "X Dizzy",    value: "xDizzy" },
];

const EYEBROW_OPTIONS = [
  { label: "Default",     value: "default" },
  { label: "Natural",     value: "defaultNatural" },
  { label: "Raised",      value: "raisedExcited" },
  { label: "Raised Nat.", value: "raisedExcitedNatural" },
  { label: "Flat",        value: "flatNatural" },
  { label: "Angry",       value: "angryNatural" },
  { label: "Sad",         value: "sadConcerned" },
  { label: "Sad Nat.",    value: "sadConcernedNatural" },
  { label: "Frown",       value: "frownNatural" },
  { label: "Unibrow",     value: "unibrowNatural" },
  { label: "Up Down",     value: "upDown" },
  { label: "Up Down Nat.",value: "upDownNatural" },
];

const MOUTH_OPTIONS = [
  { label: "Smile",       value: "smile" },
  { label: "Twinkle",     value: "twinkle" },
  { label: "Default",     value: "default" },
  { label: "Tongue",      value: "tongue" },
  { label: "Serious",     value: "serious" },
  { label: "Sad",         value: "sad" },
  { label: "Grimace",     value: "grimace" },
  { label: "Disbelief",   value: "disbelief" },
  { label: "Eating",      value: "eating" },
  { label: "Concerned",   value: "concerned" },
  { label: "Scream",      value: "scream" },
  { label: "Scream Open", value: "screamOpen" },
  { label: "Vomit",       value: "vomit" },
];

const FACIAL_HAIR_OPTIONS = [
  { label: "None",        value: "blank" },
  { label: "Light Beard", value: "beardLight" },
  { label: "Medium Beard",value: "beardMedium" },
  { label: "Majestic",    value: "beardMajestic" },
  { label: "Moustache",   value: "moustacheFancy" },
  { label: "Magnum",      value: "moustacheMagnum" },
];

const CLOTHE_OPTIONS = [
  { label: "Hoodie",       value: "hoodie",         emoji: "🧥" },
  { label: "Collar Swtr",  value: "collarSweater",  emoji: "👔" },
  { label: "Blazer Shirt", value: "blazerShirt",    emoji: "🤵" },
  { label: "Blazer Swtr",  value: "blazerSweater",  emoji: "🧑‍💼" },
  { label: "Graphic Tee",  value: "graphicShirt",   emoji: "👕" },
  { label: "Crew Neck",    value: "shirtCrewNeck",  emoji: "👕" },
  { label: "V-Neck",       value: "shirtVNeck",     emoji: "👗" },
  { label: "Scoop Neck",   value: "shirtScoopNeck", emoji: "👗" },
  { label: "Overall",      value: "overall",        emoji: "👖" },
];

const CLOTHE_COLOR_OPTIONS = [
  { label: "Pastel Blue",  value: "pastelBlue",   color: "#b6d7f5" },
  { label: "Pastel Green", value: "pastelGreen",  color: "#b6f5ce" },
  { label: "Pastel Orange",value: "pastelOrange", color: "#f5d0b6" },
  { label: "Pastel Red",   value: "pastelRed",    color: "#f5b6b6" },
  { label: "Pastel Yellow",value: "pastelYellow", color: "#f5f0b6" },
  { label: "Pink",         value: "pink",         color: "#f4b8d0" },
  { label: "Red",          value: "red",          color: "#e53935" },
  { label: "Blue",         value: "blue01",       color: "#1565c0" },
  { label: "Gray",         value: "gray01",       color: "#9e9e9e" },
  { label: "Heather",      value: "heather",      color: "#b0bec5" },
  { label: "White",        value: "white",        color: "#ffffff" },
  { label: "Black",        value: "black",        color: "#1a1a1a" },
];

const ACCESSORIES_OPTIONS = [
  { label: "None",          value: "blank" },
  { label: "Sunglasses",    value: "sunglasses" },
  { label: "Round",         value: "round" },
  { label: "Wayfarers",     value: "wayfarers" },
  { label: "Kurt",          value: "kurt" },
  { label: "Rx Glasses",    value: "prescription01" },
  { label: "Rx Glasses 2",  value: "prescription02" },
];

const BG_OPTIONS = [
  { label: "Sky Blue",  value: "b6e3f4" },
  { label: "Lavender",  value: "c0aede" },
  { label: "Peach",     value: "ffdfbf" },
  { label: "Mint",      value: "d1f4cc" },
  { label: "Pink",      value: "ffd5e5" },
  { label: "Yellow",    value: "fff3b0" },
  { label: "Lilac",     value: "e8d5f5" },
  { label: "Coral",     value: "f5d0c8" },
  { label: "White",     value: "ffffff" },
  { label: "Dark",      value: "1a1a2e" },
];

// ── BitmojiBuilder — full customizer sheet ────────────────────────────────────
const TABS = ["Skin", "Hair", "Face", "Look", "Outfit", "Extras", "BG"] as const;
type Tab = typeof TABS[number];

interface BitmojiBuilderProps {
  config: BitmojiConfig;
  onSave: (cfg: BitmojiConfig) => void;
  onClose: () => void;
}

export const BitmojiBuilder = ({ config: initialConfig, onSave, onClose }: BitmojiBuilderProps) => {
  const [cfg, setCfg] = useState<BitmojiConfig>(initialConfig);
  const [tab, setTab] = useState<Tab>("Skin");
  const [saved, setSaved] = useState(false);

  const update = (patch: Partial<BitmojiConfig>) => setCfg((c) => ({ ...c, ...patch }));

  const handleSave = () => {
    onSave(cfg);
    setSaved(true);
    setTimeout(onClose, 900);
  };

  const previewUrl = buildBitmojiUrl(cfg);

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
          <Sparkles className="w-4 h-4 text-amber-400" /> My Avatar
        </p>
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
          className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-colors ${saved ? "bg-green-500 text-white" : "bg-foreground text-background"}`}>
          {saved ? <Check className="w-4 h-4" /> : "Save"}
        </motion.button>
      </div>

      {/* Preview */}
      <div className="shrink-0 flex justify-center py-3">
        <div className="w-28 h-28 rounded-3xl overflow-hidden border-2 border-secondary/50 shadow-lg"
          style={{ backgroundColor: `#${cfg.background}` }}>
          <img src={previewUrl} alt="Avatar preview" className="w-full h-full object-contain" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 flex gap-1 px-4 pb-2 overflow-x-auto scrollbar-hide">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${tab === t ? "bg-foreground text-background" : "bg-secondary/40 text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Options area */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">

        {tab === "Skin" && (
          <div className="grid grid-cols-4 gap-3 pt-2">
            {SKIN_OPTIONS.map((s) => (
              <button key={s.value} onClick={() => update({ skinColor: s.value })}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all ${cfg.skinColor === s.value ? "ring-2 ring-foreground bg-secondary/40" : ""}`}>
                <div className="w-11 h-11 rounded-full border-2 border-secondary/60" style={{ backgroundColor: s.color }} />
                <span className="text-[10px] font-semibold text-muted-foreground">{s.label}</span>
              </button>
            ))}
          </div>
        )}

        {tab === "Hair" && (
          <div className="space-y-5 pt-2">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Hair Style</p>
              <div className="grid grid-cols-3 gap-2">
                {TOP_OPTIONS.map((h) => (
                  <button key={h.value} onClick={() => update({ top: h.value })}
                    className={`py-2.5 rounded-2xl text-[11px] font-semibold transition-all ${cfg.top === h.value ? "ring-2 ring-foreground bg-secondary/50 text-foreground" : "bg-secondary/30 text-muted-foreground"}`}>
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Hair Color</p>
              <div className="grid grid-cols-5 gap-2">
                {HAIR_COLOR_OPTIONS.map((c) => (
                  <button key={c.value} onClick={() => update({ hairColor: c.value })}
                    className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${cfg.hairColor === c.value ? "ring-2 ring-foreground" : ""}`}>
                    <div className="w-9 h-9 rounded-full border border-secondary/60" style={{ backgroundColor: c.color }} />
                    <span className="text-[9px] font-semibold text-muted-foreground">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "Face" && (
          <div className="space-y-5 pt-2">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Eyes</p>
              <div className="grid grid-cols-3 gap-2">
                {EYES_OPTIONS.map((e) => (
                  <button key={e.value} onClick={() => update({ eyes: e.value })}
                    className={`py-2.5 rounded-2xl text-[11px] font-semibold transition-all ${cfg.eyes === e.value ? "ring-2 ring-foreground bg-secondary/50 text-foreground" : "bg-secondary/30 text-muted-foreground"}`}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Eyebrows</p>
              <div className="grid grid-cols-3 gap-2">
                {EYEBROW_OPTIONS.map((e) => (
                  <button key={e.value} onClick={() => update({ eyebrow: e.value })}
                    className={`py-2.5 rounded-2xl text-[11px] font-semibold transition-all ${cfg.eyebrow === e.value ? "ring-2 ring-foreground bg-secondary/50 text-foreground" : "bg-secondary/30 text-muted-foreground"}`}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Mouth</p>
              <div className="grid grid-cols-3 gap-2">
                {MOUTH_OPTIONS.map((m) => (
                  <button key={m.value} onClick={() => update({ mouth: m.value })}
                    className={`py-2.5 rounded-2xl text-[11px] font-semibold transition-all ${cfg.mouth === m.value ? "ring-2 ring-foreground bg-secondary/50 text-foreground" : "bg-secondary/30 text-muted-foreground"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "Look" && (
          <div className="pt-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Facial Hair</p>
            <div className="grid grid-cols-3 gap-2">
              {FACIAL_HAIR_OPTIONS.map((f) => (
                <button key={f.value} onClick={() => update({ facialHair: f.value })}
                  className={`py-2.5 rounded-2xl text-[11px] font-semibold transition-all ${cfg.facialHair === f.value ? "ring-2 ring-foreground bg-secondary/50 text-foreground" : "bg-secondary/30 text-muted-foreground"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "Outfit" && (
          <div className="space-y-5 pt-2">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Clothing Style</p>
              <div className="grid grid-cols-3 gap-2">
                {CLOTHE_OPTIONS.map((o) => (
                  <button key={o.value} onClick={() => update({ clotheType: o.value })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${cfg.clotheType === o.value ? "ring-2 ring-foreground bg-secondary/50" : "bg-secondary/30"}`}>
                    <span className="text-lg">{o.emoji}</span>
                    <span className="text-[10px] font-semibold text-muted-foreground">{o.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Outfit Color</p>
              <div className="grid grid-cols-4 gap-2">
                {CLOTHE_COLOR_OPTIONS.map((c) => (
                  <button key={c.value} onClick={() => update({ clotheColor: c.value })}
                    className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${cfg.clotheColor === c.value ? "ring-2 ring-foreground" : ""}`}>
                    <div className="w-9 h-9 rounded-full border border-secondary/60" style={{ backgroundColor: c.color }} />
                    <span className="text-[9px] font-semibold text-muted-foreground">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "Extras" && (
          <div className="pt-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Accessories</p>
            <div className="grid grid-cols-3 gap-2">
              {ACCESSORIES_OPTIONS.map((a) => (
                <button key={a.value} onClick={() => update({ accessories: a.value })}
                  className={`py-2.5 rounded-2xl text-[11px] font-semibold transition-all ${cfg.accessories === a.value ? "ring-2 ring-foreground bg-secondary/50 text-foreground" : "bg-secondary/30 text-muted-foreground"}`}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "BG" && (
          <div className="pt-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Background Color</p>
            <div className="grid grid-cols-5 gap-3">
              {BG_OPTIONS.map((b) => (
                <button key={b.value} onClick={() => update({ background: b.value })}
                  className={`flex flex-col items-center gap-1.5 p-1.5 rounded-2xl transition-all ${cfg.background === b.value ? "ring-2 ring-foreground" : ""}`}>
                  <div className="w-12 h-12 rounded-2xl border border-secondary/60" style={{ backgroundColor: `#${b.value}` }} />
                  <span className="text-[9px] font-semibold text-muted-foreground">{b.label}</span>
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
