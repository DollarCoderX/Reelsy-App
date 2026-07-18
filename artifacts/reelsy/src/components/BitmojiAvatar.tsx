/**
 * BitmojiAvatar — Bitmoji-style full-body avatar system for Reelsy.
 *
 * Uses DiceBear "adventurer" style which renders full-body cartoon characters,
 * closely matching the Bitmoji/Snapchat avatar aesthetic.
 *
 * The avatar is used ONLY for sending sticker messages in DMs.
 * It is NOT a profile picture.
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Sparkles, Edit3 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BitmojiConfig {
  skinColor: string;   // hex e.g. "f9c9b6"
  hairStyle: string;   // adventurer hair id e.g. "short01"
  hairColor: string;   // hex e.g. "2c1b18"
  eyeType: string;     // adventurer eyes id e.g. "variant04"
  mouthType: string;   // adventurer mouth id e.g. "variant04"
  glasses: string;     // "none" | adventurer glasses id
  background: string;  // hex e.g. "b6e3f4"
  // Legacy fields kept for backward-compat with stored stickers:
  eyebrowType?: string;
  facialHair?: string;
  accessories?: string;
  clothes?: string;
  clotheColor?: string;
}

export const DEFAULT_CONFIG: BitmojiConfig = {
  skinColor: "f9c9b6",
  hairStyle: "short01",
  hairColor: "2c1b18",
  eyeType: "variant02",
  mouthType: "variant04",
  glasses: "none",
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

// ── Avatar URL builder — DiceBear Adventurer (full-body cartoon) ──────────────
export function buildBitmojiUrl(cfg: BitmojiConfig, overrides: Partial<Record<string, string>> = {}): string {
  const params = new URLSearchParams({
    seed: `reelsy-${cfg.skinColor}-${cfg.hairStyle}-${cfg.hairColor}`,
    backgroundColor: overrides.bg ?? cfg.background,
    skinColor: cfg.skinColor,
    hair: overrides.hair ?? cfg.hairStyle,
    hairColor: cfg.hairColor,
    eyes: overrides.eyes ?? cfg.eyeType,
    mouth: overrides.mouth ?? cfg.mouthType,
  });
  if (cfg.glasses && cfg.glasses !== "none") params.set("glasses", cfg.glasses);
  return `https://api.dicebear.com/9.x/adventurer/svg?${params.toString()}`;
}

// ── Mood sticker definitions (adventurer-compatible eye/mouth ids) ─────────────
export const MOOD_STICKERS = [
  { id: "lol",    label: "LOL 😂",     emoji: "😂", mouth: "variant12", eyes: "variant13", bg: "FFF9C4" },
  { id: "love",   label: "Love ❤️",    emoji: "❤️", mouth: "variant04", eyes: "variant06", bg: "FCE4EC" },
  { id: "hype",   label: "Hype 🔥",    emoji: "🔥", mouth: "variant04", eyes: "variant09", bg: "FFF3E0" },
  { id: "wink",   label: "Wink 😉",    emoji: "😉", mouth: "variant04", eyes: "variant08", bg: "E8F5E9" },
  { id: "cool",   label: "Cool 😎",    emoji: "😎", mouth: "variant02", eyes: "variant01", bg: "E3F2FD" },
  { id: "wow",    label: "Wow 🤩",     emoji: "🤩", mouth: "variant10", eyes: "variant14", bg: "EDE7F6" },
  { id: "bye",    label: "Bye 👋",     emoji: "👋", mouth: "variant04", eyes: "variant06", bg: "E0F7FA" },
  { id: "no",     label: "No Way 🙅",  emoji: "🙅", mouth: "variant06", eyes: "variant16", bg: "FBE9E7" },
  { id: "cry",    label: "RIP 😭",     emoji: "😭", mouth: "variant06", eyes: "variant15", bg: "E8EAF6" },
  { id: "fire",   label: "Fire 💯",    emoji: "💯", mouth: "variant12", eyes: "variant06", bg: "FFF8E1" },
  { id: "sleep",  label: "Sleepy 😴",  emoji: "😴", mouth: "variant02", eyes: "variant05", bg: "E8EAF6" },
  { id: "think",  label: "Hmm 🤔",     emoji: "🤔", mouth: "variant02", eyes: "variant01", bg: "F3E5F5" },
  { id: "gg",     label: "GG 🏆",      emoji: "🏆", mouth: "variant12", eyes: "variant06", bg: "FFFDE7" },
  { id: "nope",   label: "Nope 😑",    emoji: "😑", mouth: "variant06", eyes: "variant01", bg: "EFEBE9" },
  { id: "vibe",   label: "Vibe ✨",    emoji: "✨", mouth: "variant04", eyes: "variant06", bg: "EDE7F6" },
  { id: "shock",  label: "OMG 😱",     emoji: "😱", mouth: "variant10", eyes: "variant14", bg: "FFEBEE" },
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
  } catch { return null; }
}

// ── BitmojiStickerMessage — renders a received sticker in the chat ─────────────
interface BitmojiStickerMessageProps { text: string; isMine: boolean; }

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
      <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-lg border-2 border-background/50"
        style={{ backgroundColor: `#${mood.bg}` }}>
        <img src={url} alt={mood.label} className="w-full h-full object-cover" />
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
          <img src={buildBitmojiUrl(config)} alt="My Bitmoji" className="w-full h-full object-cover" />
        </div>
        <span className="text-[12px] font-bold">My Bitmoji</span>
      </div>
      <motion.button whileTap={{ scale: 0.9 }} onClick={onEditAvatar}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/60 text-[11px] font-semibold">
        <Edit3 className="w-3 h-3" /> Edit
      </motion.button>
    </div>
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-4 gap-2 p-2">
        {MOOD_STICKERS.map((mood) => {
          const url = buildBitmojiUrl(config, { mouth: mood.mouth, eyes: mood.eyes, bg: mood.bg });
          return (
            <motion.button key={mood.id} whileTap={{ scale: 0.9 }}
              onClick={() => onSelect(encodeBitmojiSticker(config, mood.id))}
              className="flex flex-col items-center gap-1 p-1.5 rounded-2xl bg-secondary/30 hover:bg-secondary/60 transition-colors active:scale-90">
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center"
                style={{ backgroundColor: `#${mood.bg}` }}>
                <img src={url} alt={mood.label} className="w-full h-full object-cover" />
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

// ── Option data ───────────────────────────────────────────────────────────────
const SKIN_OPTIONS = [
  { label: "Light",      value: "f9c9b6", color: "#f9c9b6" },
  { label: "Med. Light", value: "ecc5a0", color: "#ecc5a0" },
  { label: "Medium",     value: "c68642", color: "#c68642" },
  { label: "Med. Dark",  value: "ae8b76", color: "#ae8b76" },
  { label: "Dark",       value: "694d3d", color: "#694d3d" },
  { label: "Deep",       value: "3a1a15", color: "#3a1a15" },
];

const HAIR_OPTIONS = [
  { label: "Flat",         value: "short01" },
  { label: "Wave",         value: "short03" },
  { label: "Curly Short",  value: "short08" },
  { label: "Spiky",        value: "short05" },
  { label: "Pompadour",    value: "short10" },
  { label: "Afro Short",   value: "short06" },
  { label: "Big Afro",     value: "short09" },
  { label: "Mohawk",       value: "short16" },
  { label: "Long Straight",value: "long01" },
  { label: "Long Wavy",    value: "long05" },
  { label: "Long Curly",   value: "long03" },
  { label: "Bun",          value: "long14" },
  { label: "Braids",       value: "long12" },
  { label: "Ponytail",     value: "long06" },
  { label: "Bob",          value: "long08" },
  { label: "Dreads",       value: "long15" },
];

const HAIR_COLORS = [
  { label: "Black",  value: "2c1b18", color: "#2c1b18" },
  { label: "Brown",  value: "4a312c", color: "#4a312c" },
  { label: "Auburn", value: "a55728", color: "#a55728" },
  { label: "Blonde", value: "b58143", color: "#b58143" },
  { label: "Red",    value: "c93305", color: "#c93305" },
  { label: "Gray",   value: "929598", color: "#929598" },
  { label: "White",  value: "ecdcbf", color: "#ecdcbf" },
  { label: "Blue",   value: "0d3349", color: "#0d3349" },
  { label: "Pink",   value: "f59797", color: "#f59797" },
  { label: "Purple", value: "582381", color: "#582381" },
  { label: "Teal",   value: "0d9488", color: "#0d9488" },
  { label: "Orange", value: "d97706", color: "#d97706" },
];

const EYE_OPTIONS = [
  { label: "Default",   value: "variant02" },
  { label: "Happy",     value: "variant06" },
  { label: "Wink",      value: "variant08" },
  { label: "Sleepy",    value: "variant05" },
  { label: "Side",      value: "variant07" },
  { label: "Wide",      value: "variant14" },
  { label: "Cute",      value: "variant04" },
  { label: "Cool",      value: "variant01" },
  { label: "Squint",    value: "variant13" },
  { label: "Raised",    value: "variant09" },
  { label: "Wacky",     value: "variant16" },
  { label: "Star",      value: "variant10" },
];

const MOUTH_OPTIONS = [
  { label: "Smile",     value: "variant04" },
  { label: "Big Smile", value: "variant12" },
  { label: "Grin",      value: "variant01" },
  { label: "Serious",   value: "variant02" },
  { label: "Frown",     value: "variant06" },
  { label: "Surprised", value: "variant10" },
  { label: "Tongue",    value: "variant14" },
  { label: "Smirk",     value: "variant08" },
  { label: "Pout",      value: "variant07" },
];

const GLASSES_OPTIONS = [
  { label: "None",    value: "none" },
  { label: "Round",   value: "variant01" },
  { label: "Square",  value: "variant02" },
  { label: "Shades",  value: "variant03" },
  { label: "Retro",   value: "variant04" },
];

const BG_OPTIONS = [
  { label: "Sky",     value: "b6e3f4" },
  { label: "Lavender",value: "c0aede" },
  { label: "Peach",   value: "ffdfbf" },
  { label: "Mint",    value: "d1f4cc" },
  { label: "Pink",    value: "ffd5e5" },
  { label: "Yellow",  value: "fff3b0" },
  { label: "Lilac",   value: "e8d5f9" },
  { label: "Aqua",    value: "a5f3fc" },
  { label: "Sand",    value: "fde68a" },
  { label: "Dark",    value: "1a1a2e" },
];

const TABS = ["Face", "Hair", "Eyes", "Extras", "BG"] as const;
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
          <Sparkles className="w-4 h-4 text-violet-400" /> My Avatar
        </p>
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-[12px] font-bold">
          {saved ? <Check className="w-3.5 h-3.5" /> : null}
          {saved ? "Saved!" : "Save"}
        </motion.button>
      </div>

      {/* Avatar preview — large full-body display */}
      <div className="shrink-0 flex justify-center py-2">
        <div className="relative">
          <div
            className="w-36 h-36 rounded-[32px] overflow-hidden border-4 border-background shadow-2xl flex items-end justify-center"
            style={{ backgroundColor: `#${cfg.background}` }}
          >
            <img src={previewUrl} alt="Your avatar" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center border-2 border-background">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>

      {/* Mood preview strip */}
      <div className="shrink-0 px-4 pb-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Sticker Preview</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {MOOD_STICKERS.slice(0, 8).map((mood) => {
            const url = buildBitmojiUrl(cfg, { mouth: mood.mouth, eyes: mood.eyes, bg: mood.bg });
            return (
              <div key={mood.id} className="shrink-0 flex flex-col items-center gap-0.5">
                <div className="w-12 h-12 rounded-2xl overflow-hidden" style={{ backgroundColor: `#${mood.bg}` }}>
                  <img src={url} alt={mood.label} className="w-full h-full object-cover" />
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
          <div className="space-y-5 pt-2">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Skin Tone</p>
              <div className="flex gap-3 flex-wrap">
                {SKIN_OPTIONS.map((s) => (
                  <button key={s.value} onClick={() => update({ skinColor: s.value })}
                    className={`flex flex-col items-center gap-1 transition-all ${cfg.skinColor === s.value ? "scale-110" : ""}`}>
                    <div className={`w-11 h-11 rounded-full border-4 transition-all ${cfg.skinColor === s.value ? "border-foreground" : "border-transparent"}`}
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
          <div className="space-y-5 pt-2">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Style</p>
              <div className="grid grid-cols-4 gap-2">
                {HAIR_OPTIONS.map((h) => (
                  <button key={h.value} onClick={() => update({ hairStyle: h.value })}
                    className={`py-2.5 px-1 rounded-2xl text-[11px] font-semibold transition-all text-center ${cfg.hairStyle === h.value ? "ring-2 ring-foreground bg-secondary/50" : "bg-secondary/30 text-muted-foreground"}`}>
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Color</p>
              <div className="grid grid-cols-6 gap-2">
                {HAIR_COLORS.map((c) => (
                  <button key={c.value} onClick={() => update({ hairColor: c.value })}
                    className={`flex flex-col items-center gap-1 transition-all ${cfg.hairColor === c.value ? "scale-110" : ""}`}>
                    <div className={`w-9 h-9 rounded-full border-4 transition-all ${cfg.hairColor === c.value ? "border-foreground" : "border-transparent"}`}
                      style={{ backgroundColor: c.color }} />
                    <span className="text-[8px] text-muted-foreground font-medium">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "Eyes" && (
          <div className="space-y-5 pt-2">
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

        {tab === "Extras" && (
          <div className="space-y-5 pt-2">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Glasses</p>
              <div className="grid grid-cols-3 gap-2">
                {GLASSES_OPTIONS.map((g) => (
                  <button key={g.value} onClick={() => update({ glasses: g.value })}
                    className={`py-2.5 rounded-2xl text-[12px] font-semibold transition-all ${cfg.glasses === g.value ? "ring-2 ring-foreground bg-secondary/50" : "bg-secondary/30 text-muted-foreground"}`}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "BG" && (
          <div className="pt-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Background</p>
            <div className="grid grid-cols-5 gap-3">
              {BG_OPTIONS.map((b) => (
                <button key={b.value} onClick={() => update({ background: b.value })}
                  className={`flex flex-col items-center gap-1.5 p-1.5 rounded-2xl transition-all ${cfg.background === b.value ? "ring-2 ring-foreground" : ""}`}>
                  <div className="w-12 h-12 rounded-2xl border border-secondary" style={{ backgroundColor: `#${b.value}` }} />
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
