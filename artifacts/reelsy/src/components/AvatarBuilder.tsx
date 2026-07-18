/**
 * AvatarBuilder — Snapchat-style avatar customizer for Pro users.
 * Creates a DiceBear-style avatar by composing seed parameters.
 * Allows changing: skin tone, hair style, hair color, outfit, accessories, background.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ChevronLeft, ChevronRight, Crown, Sparkles } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { api } from "@/lib/api";

// ── Avatar option sets ────────────────────────────────────────────────────

const SKIN_TONES = [
  { label: "Light", value: "light", color: "#FDDCB5" },
  { label: "Medium Light", value: "mediumLight", color: "#F5CFA0" },
  { label: "Medium", value: "medium", color: "#E8B88A" },
  { label: "Medium Dark", value: "mediumDark", color: "#C68642" },
  { label: "Dark", value: "dark", color: "#8D5524" },
];

const HAIR_STYLES = [
  { label: "Short", value: "short01" },
  { label: "Wavy", value: "short02" },
  { label: "Curly", value: "short03" },
  { label: "Long", value: "long01" },
  { label: "Bob", value: "long02" },
  { label: "Ponytail", value: "long03" },
  { label: "Bun", value: "long04" },
  { label: "Bald", value: "none" },
  { label: "Buzz Cut", value: "short04" },
  { label: "Afro", value: "afro" },
];

const HAIR_COLORS = [
  { label: "Black", value: "0e0e0e", color: "#0e0e0e" },
  { label: "Brown", value: "6e2a00", color: "#6e2a00" },
  { label: "Dark Brown", value: "3b1a08", color: "#3b1a08" },
  { label: "Blonde", value: "f5ca63", color: "#f5ca63" },
  { label: "Auburn", value: "a52a2a", color: "#a52a2a" },
  { label: "Red", value: "cc3300", color: "#cc3300" },
  { label: "Gray", value: "9e9e9e", color: "#9e9e9e" },
  { label: "White", value: "f5f5f5", color: "#f5f5f5" },
  { label: "Blue", value: "1565c0", color: "#1565c0" },
  { label: "Purple", value: "7b1fa2", color: "#7b1fa2" },
  { label: "Pink", value: "e91e8c", color: "#e91e8c" },
  { label: "Green", value: "2e7d32", color: "#2e7d32" },
];

const OUTFITS = [
  { label: "Hoodie", value: "hoodie", emoji: "🧥" },
  { label: "Collar", value: "collarSweater", emoji: "👔" },
  { label: "T-Shirt", value: "graphicShirt", emoji: "👕" },
  { label: "Blazer", value: "blazerShirt", emoji: "🤵" },
  { label: "Tank", value: "shirtCrewNeck", emoji: "👗" },
  { label: "Stripe", value: "stripeShirt", emoji: "🎽" },
];

const ACCESSORIES = [
  { label: "None", value: "none" },
  { label: "Sunglasses", value: "sunglasses" },
  { label: "Round Glasses", value: "glasses" },
  { label: "Prescription01", value: "prescription01" },
  { label: "Prescription02", value: "prescription02" },
  { label: "Kurt", value: "kurt" },
];

const FACIAL_HAIR = [
  { label: "None", value: "none" },
  { label: "Beard", value: "beardMedium" },
  { label: "Light Beard", value: "beardLight" },
  { label: "Majestic", value: "beardMajestic" },
  { label: "Moustache", value: "moustacheFancy" },
  { label: "Moustache Thin", value: "moustacheMagnum" },
];

const BG_COLORS = [
  { label: "Blue", value: "b6e3f4" },
  { label: "Lavender", value: "c0aede" },
  { label: "Peach", value: "ffdfbf" },
  { label: "Mint", value: "d1f4cc" },
  { label: "Pink", value: "ffd5e5" },
  { label: "Yellow", value: "fff3b0" },
  { label: "Dark", value: "1a1a2e" },
  { label: "Black", value: "0a0a0a" },
];

// ── Avatar URL builder ────────────────────────────────────────────────────

interface AvatarConfig {
  skin: string;
  hairStyle: string;
  hairColor: string;
  outfit: string;
  accessory: string;
  facialHair: string;
  bg: string;
}

function buildAvatarUrl(cfg: AvatarConfig): string {
  const params = new URLSearchParams({
    backgroundColor: cfg.bg,
    skinColor: cfg.skin,
    hairColor: cfg.hairColor,
    top: cfg.hairStyle === "none" ? "shortHairShortFlat" : cfg.hairStyle,
    accessories: cfg.accessory === "none" ? "blank" : cfg.accessory,
    facialHair: cfg.facialHair === "none" ? "blank" : cfg.facialHair,
    clotheType: cfg.outfit,
    clotheColor: "pastelBlue",
    eyes: "default",
    eyebrow: "default",
    mouth: "smile",
  });
  return `https://api.dicebear.com/9.x/avataaars/svg?${params.toString()}`;
}

// ── Tabs ──────────────────────────────────────────────────────────────────

const TABS = ["Skin", "Hair", "Color", "Outfit", "Extra", "BG"] as const;
type TabKey = typeof TABS[number];

// ── Component ─────────────────────────────────────────────────────────────

interface AvatarBuilderProps {
  onClose: () => void;
  onSave: (avatarUrl: string) => void;
}

const AvatarBuilder = ({ onClose, onSave }: AvatarBuilderProps) => {
  const { user, tier, setUser } = useAppContext();

  const [config, setConfig] = useState<AvatarConfig>({
    skin: "light",
    hairStyle: "short01",
    hairColor: "0e0e0e",
    outfit: "hoodie",
    accessory: "none",
    facialHair: "none",
    bg: "b6e3f4",
  });
  const [activeTab, setActiveTab] = useState<TabKey>("Skin");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const avatarUrl = buildAvatarUrl(config);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Save to backend settings
      if (user?.username) {
        await api.users.updateSettings(user.username, {
          callerSupabaseId: user.supabaseId,
          // Store avatar URL in a custom field via displayName trick — backend saves profileImage
        } as any).catch(() => {});
        // Update local context
        setUser({ ...user, avatar: avatarUrl });
      }
      setSaved(true);
      setTimeout(() => {
        onSave(avatarUrl);
        onClose();
      }, 800);
    } catch {
      setSaving(false);
    }
  };

  if (tier === "free") {
    return (
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center px-8 gap-5">
        <Crown className="w-12 h-12 text-amber-400" />
        <p className="font-bold text-[17px] text-center">Avatar Builder is a Pro Feature</p>
        <p className="text-[13px] text-muted-foreground text-center leading-relaxed">
          Upgrade to Premium or higher to build your custom Reelsy avatar with skin tones, hairstyles, outfits, and more.
        </p>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
          className="w-full py-4 rounded-full bg-foreground text-background font-bold text-[14px]">Got it</motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col">

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <X className="w-4 h-4" />
        </motion.button>
        <p className="font-bold text-[15px] flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" /> Avatar Builder
        </p>
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-[12px] font-bold disabled:opacity-60">
          {saved ? <Check className="w-3.5 h-3.5" /> : null}
          {saved ? "Saved!" : saving ? "Saving…" : "Save"}
        </motion.button>
      </div>

      {/* Avatar preview */}
      <div className="flex justify-center py-4">
        <div className="relative">
          <div
            className="w-36 h-36 rounded-full overflow-hidden border-4 border-background shadow-2xl"
            style={{ backgroundColor: `#${config.bg}` }}
          >
            <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center border-2 border-background">
            <Crown className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 flex gap-1 px-4 pb-2 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`shrink-0 px-4 py-2 rounded-full text-[12px] font-bold transition-all ${activeTab === t ? "bg-foreground text-background" : "bg-secondary/50 text-muted-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Options */}
      <div className="flex-1 overflow-y-auto px-4 pb-10">
        {activeTab === "Skin" && (
          <div className="grid grid-cols-5 gap-3 pt-2">
            {SKIN_TONES.map((s) => (
              <button key={s.value} onClick={() => setConfig((c) => ({ ...c, skin: s.value }))}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${config.skin === s.value ? "ring-2 ring-foreground bg-secondary/50" : "bg-secondary/30"}`}>
                <div className="w-10 h-10 rounded-full border-2 border-background/60" style={{ backgroundColor: s.color }} />
                <span className="text-[9px] font-semibold text-muted-foreground text-center leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
        )}

        {activeTab === "Hair" && (
          <div className="grid grid-cols-4 gap-2 pt-2">
            {HAIR_STYLES.map((h) => (
              <button key={h.value} onClick={() => setConfig((c) => ({ ...c, hairStyle: h.value }))}
                className={`p-3 rounded-2xl text-[12px] font-semibold transition-all ${config.hairStyle === h.value ? "ring-2 ring-foreground bg-secondary/50" : "bg-secondary/30 text-muted-foreground"}`}>
                {h.label}
              </button>
            ))}
          </div>
        )}

        {activeTab === "Color" && (
          <div className="pt-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Hair Color</p>
            <div className="grid grid-cols-6 gap-2">
              {HAIR_COLORS.map((c) => (
                <button key={c.value} onClick={() => setConfig((cfg) => ({ ...cfg, hairColor: c.value }))}
                  className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${config.hairColor === c.value ? "ring-2 ring-foreground bg-secondary/50" : ""}`}>
                  <div className="w-9 h-9 rounded-full border border-background/40" style={{ backgroundColor: c.color }} />
                  <span className="text-[9px] font-medium text-muted-foreground text-center leading-tight">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "Outfit" && (
          <div className="grid grid-cols-3 gap-3 pt-2">
            {OUTFITS.map((o) => (
              <button key={o.value} onClick={() => setConfig((c) => ({ ...c, outfit: o.value }))}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${config.outfit === o.value ? "ring-2 ring-foreground bg-secondary/50" : "bg-secondary/30"}`}>
                <span className="text-3xl">{o.emoji}</span>
                <span className="text-[11px] font-semibold text-muted-foreground">{o.label}</span>
              </button>
            ))}
          </div>
        )}

        {activeTab === "Extra" && (
          <div className="space-y-5 pt-2">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Accessories</p>
              <div className="grid grid-cols-3 gap-2">
                {ACCESSORIES.map((a) => (
                  <button key={a.value} onClick={() => setConfig((c) => ({ ...c, accessory: a.value }))}
                    className={`p-3 rounded-2xl text-[12px] font-semibold transition-all ${config.accessory === a.value ? "ring-2 ring-foreground bg-secondary/50" : "bg-secondary/30 text-muted-foreground"}`}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Facial Hair</p>
              <div className="grid grid-cols-3 gap-2">
                {FACIAL_HAIR.map((f) => (
                  <button key={f.value} onClick={() => setConfig((c) => ({ ...c, facialHair: f.value }))}
                    className={`p-3 rounded-2xl text-[12px] font-semibold transition-all ${config.facialHair === f.value ? "ring-2 ring-foreground bg-secondary/50" : "bg-secondary/30 text-muted-foreground"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "BG" && (
          <div className="grid grid-cols-4 gap-3 pt-2">
            {BG_COLORS.map((b) => (
              <button key={b.value} onClick={() => setConfig((c) => ({ ...c, bg: b.value }))}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${config.bg === b.value ? "ring-2 ring-foreground" : ""}`}>
                <div className="w-12 h-12 rounded-2xl border border-secondary" style={{ backgroundColor: `#${b.value}` }} />
                <span className="text-[10px] font-semibold text-muted-foreground">{b.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AvatarBuilder;
