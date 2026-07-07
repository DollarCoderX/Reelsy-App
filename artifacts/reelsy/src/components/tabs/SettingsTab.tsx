import { useEffect, useRef, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { signOut as supabaseSignOut } from "@/lib/supabase-client";

import { AppLanguage, useAppContext } from "@/context/AppContext";
import {
  User, Mail, Shield, Bell, Globe, Moon, HelpCircle, FileText, LogOut, ChevronRight,
  Sun, Camera, Lock, Star, Check, X, Crown, VerifiedIcon, Flame, Hash, ChevronLeft,
  Eye, EyeOff, Users, Clock, Infinity as InfinityIcon, MessageSquare, Loader2, Palette,
  Send, Phone, Plus, Sparkles, Bot, ChevronDown, UserCircle2, LogIn,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AvatarCustomizer from "../AvatarCustomizer";
import { VerificationModal } from "../VerificationModal";
import reelsyLogo from "@assets/db1645cc1ed95625a5dff41ee9a0f164_1778235733181.jpg";

const AvatarDisplay = ({ src, className }: { src: string; className: string }) =>
  src.startsWith("<")
    ? <div dangerouslySetInnerHTML={{ __html: src }} className={className} />
    : <img src={src} alt="avatar" className={`${className} object-cover`} />;

const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
  <motion.button onClick={onChange} whileTap={{ scale: 0.92 }}
    animate={{ backgroundColor: value ? "hsl(var(--foreground))" : "hsl(var(--muted))" }}
    transition={{ duration: 0.18 }}
    className="w-11 h-6 rounded-full flex items-center px-0.5 shrink-0">
    <motion.div animate={{ x: value ? 20 : 1 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="w-5 h-5 rounded-full bg-background shadow-sm" />
  </motion.button>
);

const SettingRow = ({ icon: Icon, label, value, onPress, rightElement, danger }: {
  icon: React.ElementType; label: string; value?: string;
  onPress?: () => void; rightElement?: React.ReactNode; danger?: boolean;
}) => (
  <motion.button onClick={onPress} whileTap={{ opacity: 0.7 }}
    className="w-full flex items-center justify-between px-4 py-3.5 text-left">
    <div className="flex items-center gap-2.5">
      <Icon className={`w-4 h-4 ${danger ? "text-rose-500" : "text-muted-foreground"}`} strokeWidth={1.8} />
      <span className={`font-medium text-[13px] ${danger ? "text-rose-500" : ""}`}>{label}</span>
    </div>
    <div className="flex items-center gap-1.5 text-muted-foreground">
      {value && <span className="text-[12px]">{value}</span>}
      {rightElement || <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />}
    </div>
  </motion.button>
);

const Section = ({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}>
    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">{title}</p>
    <div className="bg-secondary/50 rounded-2xl overflow-hidden divide-y divide-background/60">
      {children}
    </div>
  </motion.div>
);

const PhoneNumberRow = () => {
  const { user, setUser } = useAppContext();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("reelsy_auth_token");
      if (token && user?.username) {
        await fetch(`/api/users/${user.username}/phone`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ phone: value.trim() }),
        });
      }
      if (user) setUser({ ...user, phone: value.trim() });
      setSaved(true);
      setTimeout(() => { setSaved(false); setEditing(false); }, 1500);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="px-4 py-3 flex items-center gap-3">
        <Phone className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.8} />
        <input
          autoFocus
          type="tel"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="+1 234 567 8900"
          style={{ fontSize: 14 }}
          className="flex-1 bg-secondary rounded-xl px-3 py-2 font-medium outline-none"
        />
        <AnimatePresence mode="wait">
          {saved ? (
            <motion.div key="done" initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </motion.div>
          ) : (
            <motion.button key="save" whileTap={{ scale: 0.9 }} onClick={handleSave} disabled={saving}
              className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center disabled:opacity-40">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </motion.button>
          )}
        </AnimatePresence>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setEditing(false)}
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <X className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    );
  }

  return (
    <motion.button onClick={() => setEditing(true)} whileTap={{ opacity: 0.7 }}
      className="w-full flex items-center justify-between px-4 py-3.5 text-left">
      <div className="flex items-center gap-2.5">
        <Phone className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
        <span className="font-medium text-[13px]">Phone Number</span>
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {user?.phone ? (
          <span className="text-[12px]">{user.phone}</span>
        ) : (
          <span className="text-[12px] text-muted-foreground">Add number</span>
        )}
        <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
      </div>
    </motion.button>
  );
};

// ---- Subscription Modal ----
const PLAN_FEATURES: Record<string, string[]> = {
  free: ["Unlimited texts & calls", "Posts visible 24 hours", "Chat history: 24 hours", "10 AI requests/day"],
  premium: ["Unlimited texts & calls", "Posts up to 7 days (customizable)", "Chat history: forever", "30 AI requests/day", "Clean message delete"],
  "premium+": ["Everything in Premium", "50 AI requests/day", "Custom number format", "Ghost delete (no trace)", "Enhanced post control"],
  verified: ["Business access", "AD management", "In app payment"],
};

const PLAN_BASE_PRICES_USD: Record<string, number> = {
  // UI only. Real billing/payment is not implemented here.
  premium: 9.99,
  "premium+": 19.99,
};

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  NGN: "₦",
  GBP: "£",
  EUR: "€",
  GHS: "GH₵",
  KES: "KSh",
  TZS: "TSh",
  UGX: "USh",
  ZAR: "R",
  EGP: "ج.م",
  MAD: "د.م",
  XOF: "CFA",
  XAF: "CFA",
  INR: "₹",
  PKR: "₨",
  BDT: "৳",
  LKR: "Rs",
  BRL: "R$",
  MXN: "$",
  COP: "$",
  ARS: "$",
  CLP: "$",
  AUD: "A$",
  NZD: "NZ$",
};

// Approx static exchange rates for UI display.
// If currency isn't in this table, we fall back to USD.
const UI_EXCHANGE_RATES_TO_TARGET: Record<string, number> = {
  USD: 1,
  NGN: 1500,
  GBP: 0.78,
  EUR: 0.92,
  GHS: 12,
  KES: 145,
  TZS: 2500,
  UGX: 3700,
  ZAR: 18,
  EGP: 48,
  INR: 83,
};

const formatPlanPrice = (plan: string, currency: string | null | undefined) => {
  if (plan === "free") return "Free";
  if (plan === "verified") return "Invite only";

  const baseUsd = PLAN_BASE_PRICES_USD[plan as keyof typeof PLAN_BASE_PRICES_USD];
  if (!baseUsd) return "";

  const target = (currency || "USD").toUpperCase();
  const symbol = CURRENCY_SYMBOL[target] || "$";
  const rate = UI_EXCHANGE_RATES_TO_TARGET[target] ?? UI_EXCHANGE_RATES_TO_TARGET.USD;

  const amount = baseUsd * rate;
  // Nigeria often uses whole naira for pricing; others show 2 decimals.
  const decimals = target === "NGN" ? 0 : 2;
  const rounded = decimals === 0 ? Math.round(amount) : Math.round(amount * 100) / 100;
  const numStr = decimals === 0 ? String(rounded) : rounded.toFixed(decimals);
  return `${symbol}${numStr}/mo`;
};


const PLAN_ICONS: Record<string, React.ElementType> = {
  free: Star,
  premium: Crown,
  "premium+": Flame,
  verified: VerifiedIcon,
};


const SubscriptionModal = ({ onClose }: { onClose: () => void }) => {
  const { tier, setTier, ip } = useAppContext();
  const [selected, setSelected] = useState<string>(tier);

  useEffect(() => {
    // Kick off IP detection so currency renders correctly
    // (it was previously only checked on Upgrade click)
    ip.checkConnection().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);

  const plans = ["free", "premium", "premium+", "verified"];

  const handleUpgrade = async () => {
    if (selected === "verified" || selected === tier) { onClose(); return; }
    setPaying(true);

    const isValid = await ip.checkConnection();
    if (!isValid) {
      setPaying(false);
      onClose();
      return;
    }

    setTimeout(() => {
      setTier(selected as any);
      setPaying(false);
      setDone(true);
      setTimeout(onClose, 1400);
    }, 1800);
  };

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <X className="w-4 h-4" />
        </motion.button>
        <p className="font-bold text-[15px]">Choose a Plan</p>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none px-4 pb-6">
        <div className="space-y-3 mb-6">
          {plans.map((plan) => {
            const Icon = PLAN_ICONS[plan];
            const isActive = tier === plan;
            const isSelected = selected === plan;
            const locked = plan === "verified";
            return (
              <motion.button key={plan} whileTap={{ scale: locked ? 1 : 0.98 }}
                onClick={() => !locked && setSelected(plan)}
                className={`w-full text-left p-4 rounded-2xl transition-all border-2 ${isSelected ? "border-foreground bg-foreground/5" : "border-secondary bg-secondary/30"
                  } ${locked ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" strokeWidth={2} />
                    <span className="font-bold text-[14px] capitalize">{plan === "premium+" ? "Premium+" : plan.charAt(0).toUpperCase() + plan.slice(1)}</span>
                    {isActive && <span className="px-1.5 py-0.5 rounded-full bg-foreground text-background text-[9px] font-bold">Current</span>}
                  </div>
                    <span className="font-bold text-[13px]">{formatPlanPrice(plan, ip.currency)}</span>

                </div>
                <div className="space-y-1">
                  {PLAN_FEATURES[plan].map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-foreground shrink-0" strokeWidth={2.5} />
                      <span className="text-[11px] text-muted-foreground">{f}</span>
                    </div>
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 px-4 pb-10 pt-2">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 py-4 rounded-full bg-emerald-500 text-white font-bold text-[14px]">
              <Check className="w-5 h-5" strokeWidth={2.5} /> Plan Updated!
            </motion.div>
          ) : (
            <motion.button key="btn" whileTap={{ scale: 0.97 }} onClick={handleUpgrade}
              disabled={selected === "verified" || paying}
              className="w-full py-4 rounded-full bg-foreground text-background font-bold text-[14px] disabled:opacity-50 flex items-center justify-center gap-2">
              {paying && <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />}
              {paying ? "Processing..." : selected === tier ? "Current Plan" : selected === "verified" ? "Invite Only" : `Upgrade to ${selected}`}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ---- Virtual Number Modal ----
const generateReelsyNumbers = () =>
  Array.from({ length: 3 }, (_, i) => `+025-REELSY-${Math.floor(100 + Math.random() * 900).toString().padStart(3, "0")}`);

const ScanBar = () => (
  <div className="relative w-full h-1.5 bg-secondary rounded-full overflow-hidden">
    <motion.div
      animate={{ x: ["-100%", "400%"] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-violet-500 to-transparent rounded-full"
    />
  </div>
);

const VirtualNumberModal = ({ onClose, onSave }: { onClose: () => void; onSave: (num: string) => void }) => {
  const { tier } = useAppContext();
  const [step, setStep] = useState<"form" | "choose" | "custom" | "scanning">("form");
  const [form, setForm] = useState({ email: "", country: "", location: "" });
  const [numbers] = useState(generateReelsyNumbers);
  const [chosen, setChosen] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [scanDone, setScanDone] = useState(false);

  const customDigits = Math.floor(100 + Math.random() * 900);
  const customFormatted = customName ? `+025-${customName.replace(/\s+/g, "")}_REELSY_${customDigits}` : "+025-yourname_REELSY_000";

  const startScan = () => {
    setStep("scanning");
    setScanDone(false);
    setTimeout(() => setScanDone(true), 2400);
  };

  const isPremiumPlus = tier === "premium+";

  if (tier === "free") {
    return (
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center px-8 gap-4">
        <Crown className="w-10 h-10 text-muted-foreground" />
        <p className="font-bold text-[17px] text-center">Premium Feature</p>
        <p className="text-[13px] text-muted-foreground text-center">Upgrade to Premium to get access to more features</p>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
          className="w-full py-4 rounded-full bg-foreground text-background font-bold text-[14px]">Got it</motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
        {step === "choose" || step === "custom" || step === "scanning" ? (
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => step === "scanning" ? undefined : step === "custom" ? setStep("choose") : setStep("form")}
            className={`w-9 h-9 rounded-full bg-secondary flex items-center justify-center ${step === "scanning" ? "opacity-30 pointer-events-none" : ""}`}>
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
        ) : (
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </motion.button>
        )}
        <p className="font-bold text-[15px]">
          {step === "custom" || step === "scanning" ? "Custom Number" : "Reelsy Number"}
        </p>
        <div className="w-9" />
      </div>

      <AnimatePresence mode="wait">
        {step === "form" && (
          <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <p className="text-[13px] text-muted-foreground mb-2">Fill in your details and we'll generate your number options.</p>
            {[
              { key: "email", placeholder: "Email address", type: "email" },
              { key: "country", placeholder: "Country", type: "text" },
              { key: "location", placeholder: "City / Location", type: "text" },
            ].map((field) => (
              <input key={field.key} type={field.type} placeholder={field.placeholder}
                value={form[field.key as keyof typeof form]}
                onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
                style={{ fontSize: 16 }}
                className="w-full h-[52px] px-4 bg-secondary rounded-2xl font-medium outline-none" />
            ))}
            <div className="shrink-0 pt-4">
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={() => form.email && form.country && form.location && setStep("choose")}
                disabled={!form.email || !form.country || !form.location}
                className="w-full py-4 rounded-full bg-foreground text-background font-bold text-[14px] disabled:opacity-40">
                Generate My Numbers
              </motion.button>
            </div>
          </motion.div>
        )}

        {step === "choose" && (
          <motion.div key="choose" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex-1 overflow-y-auto px-5 py-4">
            <p className="text-[13px] text-muted-foreground mb-4">Choose one of your exclusive Reelsy numbers.</p>

            {isPremiumPlus && (
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep("custom")}
                className="w-full flex items-center justify-between px-4 py-4 rounded-2xl border-2 border-violet-500/40 bg-violet-500/8 mb-4">
                <div className="flex items-center gap-3">
                  <Flame className="w-4 h-4 text-violet-500" />
                  <div className="text-left">
                    <p className="font-bold text-[13px] text-violet-600">Create Custom Number</p>
                    <p className="text-[10px] text-violet-400">Premium+ exclusive</p>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-violet-400 rotate-180" />
              </motion.button>
            )}

            <div className="space-y-2.5">
              {numbers.map((num) => (
                <motion.button key={num} whileTap={{ scale: 0.97 }} onClick={() => setChosen(num)}
                  className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl border-2 transition-all ${chosen === num ? "border-foreground bg-foreground/5" : "border-secondary"
                    }`}>
                  <div className="flex items-center gap-3">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold text-[15px] tracking-wide font-mono">{num}</span>
                  </div>
                  {chosen === num && <Check className="w-4 h-4" strokeWidth={2.5} />}
                </motion.button>
              ))}
            </div>
            <div className="pt-6">
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => chosen && onSave(chosen)} disabled={!chosen}
                className="w-full py-4 rounded-full bg-foreground text-background font-bold text-[14px] disabled:opacity-40">
                Claim This Number
              </motion.button>
            </div>
          </motion.div>
        )}

        {step === "custom" && (
          <motion.div key="custom" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl bg-violet-500/10">
              <Flame className="w-3.5 h-3.5 text-violet-500 shrink-0" />
              <p className="text-[11px] text-violet-600 font-medium">Premium+ exclusive — create your personalized Reelsy number</p>
            </div>
            <p className="text-[13px] text-muted-foreground mb-3">Choose a name to include in your number:</p>
            <input
              type="text" placeholder="Enter your name or alias"
              value={customName} onChange={(e) => setCustomName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              style={{ fontSize: 16 }} maxLength={20}
              className="w-full h-[52px] px-4 bg-secondary rounded-2xl font-medium outline-none mb-5" />

            <p className="text-[11px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Preview</p>
            <div className="px-4 py-4 rounded-2xl bg-secondary mb-6">
              <p className="font-bold text-[16px] font-mono tracking-wide text-center">
                {customName ? `+025-${customName}_REELSY_${customDigits}` : <span className="text-muted-foreground/50">+025-yourname_REELSY_000</span>}
              </p>
            </div>

            <motion.button whileTap={{ scale: 0.97 }} disabled={customName.length < 2}
              onClick={startScan}
              className="w-full py-4 rounded-full bg-violet-500 text-white font-bold text-[14px] disabled:opacity-40">
              Check Availability
            </motion.button>
          </motion.div>
        )}

        {step === "scanning" && (
          <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              {scanDone
                ? <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 28 }}>
                  <Check className="w-8 h-8 text-violet-500" strokeWidth={2.5} />
                </motion.div>
                : <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                  <Loader2 className="w-8 h-8 text-violet-500" />
                </motion.div>
              }
            </div>

            <div className="w-full space-y-3">
              <p className="text-center font-bold text-[15px]">
                {scanDone ? "Number is available!" : "Scanning network..."}
              </p>
              <ScanBar />
              <p className="text-center text-[11px] text-muted-foreground font-mono">
                {customFormatted}
              </p>
            </div>

            <AnimatePresence>
              {scanDone && (
                <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onSave(`+025-${customName}_REELSY_${customDigits}`)}
                  className="w-full py-4 rounded-full bg-violet-500 text-white font-bold text-[14px] shadow-lg shadow-violet-500/25">
                  Claim +025-{customName}_REELSY_{customDigits}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ---- Edit Profile Sheet ----
const EditProfileSheet = ({ onClose }: { onClose: () => void }) => {
  const { user, setUser } = useAppContext();
  const { toast } = useToast();
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [email, setEmail] = useState(user?.email || "");

  const handleSave = async () => {
    if (!user) {
      onClose();
      return;
    }

    try {
      const response = await fetch('/api/auth/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          displayName: nickname,
          profileImage: user.avatar,
          age: user.age,
          interests: user.interests,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Unable to update profile');
      }

      setUser({ ...user, nickname, bio, email });
      toast({ title: 'Profile saved', description: 'Your name has been updated.', variant: 'default' });
    } catch (error) {
      console.error('Profile update failed', error);
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Could not save your profile.',
        variant: 'destructive',
      });
    } finally {
      onClose();
    }
  };

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <X className="w-4 h-4" />
        </motion.button>
        <p className="font-bold text-[15px]">Edit Profile</p>
        <motion.button whileTap={{ scale: 0.9 }} onClick={handleSave}
          className="px-3.5 py-1.5 rounded-full bg-foreground text-background text-[12px] font-bold">
          Save
        </motion.button>
      </div>
      <div className="flex-1 px-5 pt-2 space-y-3">
        <div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1.5 px-1">Real Name</p>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)}
            placeholder="Your real name" style={{ fontSize: 16 }}
            className="w-full h-[52px] px-4 bg-secondary rounded-2xl font-medium outline-none" />
        </div>

        <div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1.5 px-1">Email</p>
          <input value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email" style={{ fontSize: 16 }}
            className="w-full h-[52px] px-4 bg-secondary rounded-2xl font-medium outline-none" />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1.5 px-1">Bio</p>
          <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 160))}
            placeholder="Tell people about yourself..." rows={3}
            style={{ fontSize: 14 }}
            className="w-full px-4 py-3 bg-secondary rounded-2xl font-medium outline-none resize-none" />
          <p className="text-right text-[11px] text-muted-foreground mt-1">{bio.length}/160</p>
        </div>
      </div>

    </motion.div>
  );
};

// ---- Privacy Sheet ----
const PrivacySheet = ({ onClose }: { onClose: () => void }) => {
  const { user, setUser } = useAppContext();
  const [friendPolicy, setFriendPolicy] = useState<"open" | "request-only">(user?.friendPolicy || "request-only");
  const [showActivity, setShowActivity] = useState(true);
  const [showOnline, setShowOnline] = useState(true);

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => { if (user) setUser({ ...user, friendPolicy }); onClose(); }}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <X className="w-4 h-4" />
        </motion.button>
        <p className="font-bold text-[15px]">Privacy</p>
        <div className="w-9" />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Friend Requests</p>
          <div className="bg-secondary/50 rounded-2xl overflow-hidden divide-y divide-background/60">
            {[
              { value: "open", label: "Open to everyone", desc: "Anyone can message you directly" },
              { value: "request-only", label: "Friends only", desc: "Others must send a friend request first" },
            ].map((opt) => (
              <button key={opt.value} onClick={() => setFriendPolicy(opt.value as any)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left">
                <div>
                  <p className="font-medium text-[13px]">{opt.label}</p>
                  <p className="text-muted-foreground text-[11px]">{opt.desc}</p>
                </div>
                {friendPolicy === opt.value && <Check className="w-4 h-4" strokeWidth={2.5} />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Visibility</p>
          <div className="bg-secondary/50 rounded-2xl overflow-hidden divide-y divide-background/60">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <Eye className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
                <div>
                  <p className="font-medium text-[13px]">Show activity status</p>
                  <p className="text-[11px] text-muted-foreground">Let friends see when you're active</p>
                </div>
              </div>
              <Toggle value={showActivity} onChange={() => setShowActivity(!showActivity)} />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <EyeOff className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
                <div>
                  <p className="font-medium text-[13px]">Online indicator</p>
                  <p className="text-[11px] text-muted-foreground">Show green dot when online</p>
                </div>
              </div>
              <Toggle value={showOnline} onChange={() => setShowOnline(!showOnline)} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ---- Notifications Sheet ----
const NotificationsSheet = ({ onClose }: { onClose: () => void }) => {
  const [prefs, setPrefs] = useState({ messages: true, friendRequests: true, likes: true, comments: true, reposts: false, mentions: true });
  const toggle = (key: keyof typeof prefs) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const items = [
    { key: "messages", label: "Messages", desc: "New DMs and group messages" },
    { key: "friendRequests", label: "Friend Requests", desc: "When someone adds you" },
    { key: "likes", label: "Likes", desc: "When someone likes your post" },
    { key: "comments", label: "Comments", desc: "When someone comments" },
    { key: "reposts", label: "Reposts", desc: "When someone reposts your content" },
    { key: "mentions", label: "Mentions", desc: "When you're mentioned in a post" },
  ];

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <X className="w-4 h-4" />
        </motion.button>
        <p className="font-bold text-[15px]">Notifications</p>
        <div className="w-9" />
      </div>
      <div className="flex-1 overflow-y-auto px-4">
        <div className="bg-secondary/50 rounded-2xl overflow-hidden divide-y divide-background/60">
          {items.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="font-medium text-[13px]">{label}</p>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
              </div>
              <Toggle value={prefs[key as keyof typeof prefs]} onChange={() => toggle(key as keyof typeof prefs)} />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// ---- Post Retention Sheet ----
const PostRetentionSheet = ({ onClose }: { onClose: () => void }) => {
  const { tier } = useAppContext();
  const [retention, setRetention] = useState("24h");
  const options = tier === "free"
    ? [{ value: "24h", label: "24 hours", desc: "Posts auto-delete after 24h" }]
    : [
      { value: "24h", label: "24 hours", desc: "Posts auto-delete after 24h" },
      { value: "72h", label: "3 days", desc: "Posts auto-delete after 3 days" },
      { value: "7d", label: "7 days", desc: "Posts auto-delete after 7 days" },
      { value: "custom", label: "Custom", desc: "Set a specific date (max 7 days)" },
    ];

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <X className="w-4 h-4" />
        </motion.button>
        <p className="font-bold text-[15px]">Post Retention</p>
        <div className="w-9" />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {tier === "free" && (
          <div className="mb-4 p-3 rounded-2xl bg-secondary/50 flex items-center gap-3">
            <Crown className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-[12px] text-muted-foreground">Upgrade to Premium to customize post retention.</p>
          </div>
        )}
        <div className="bg-secondary/50 rounded-2xl overflow-hidden divide-y divide-background/60">
          {options.map((opt) => (
            <button key={opt.value} onClick={() => tier !== "free" && setRetention(opt.value)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left">
              <div>
                <p className="font-medium text-[13px]">{opt.label}</p>
                <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
              </div>
              {retention === opt.value && <Check className="w-4 h-4" strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// ---- Language Sheet ----
const LANGUAGES: AppLanguage[] = [
  "English", "French", "Spanish", "Portuguese", "Arabic", "Yoruba",
  "Igbo", "Hausa", "Swahili", "German", "Japanese", "Korean",
  "Chinese (Simplified)", "Hindi", "Turkish", "Dutch",
];

const LanguageSheet = ({ onClose }: { onClose: () => void }) => {
  const { language, setLanguage, t } = useAppContext();
  const [selected, setSelected] = useState<AppLanguage>(language);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setLanguage(selected);
    setSaved(true);
    setTimeout(onClose, 900);
  };

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <X className="w-4 h-4" />
        </motion.button>
        <p className="font-bold text-[15px]">{t("Language")}</p>
        <div className="w-9" />
      </div>
      <div className="flex-1 overflow-y-auto px-4">
        <div className="bg-secondary/50 rounded-2xl overflow-hidden divide-y divide-background/60">
          {LANGUAGES.map((lang) => (
            <button key={lang} onClick={() => setSelected(lang)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left">
              <span className="font-medium text-[13px]">{lang}</span>
              {selected === lang && <Check className="w-4 h-4" strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      </div>
      <div className="shrink-0 px-4 pb-10 pt-3">
        <AnimatePresence mode="wait">
          {saved ? (
            <motion.div key="saved" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 py-4 rounded-full bg-emerald-500 text-white font-bold text-[14px]">
              <Check className="w-5 h-5" strokeWidth={2.5} /> {t("Applied!")}
            </motion.div>
          ) : (
            <motion.button key="btn" whileTap={{ scale: 0.97 }} onClick={handleSave}
              className="w-full py-4 rounded-full bg-foreground text-background font-bold text-[14px]">
              {t("Apply Language")}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ---- Help Center AI ----
const REELSY_HELP_CONTEXT = `
Public Reelsy help facts:
- Reelsy is a social app for private messaging, friends, posts, drafts, music attachments, hashtags, mentions, and avatar customization.
- Free posts last 24 hours. Premium users can set custom retention up to 7 days.
- Drafts are auto-deleted after 2 days.
- Premium and Premium+ can attach current location to posts.
- Premium and Premium+ can use AI post writing. Premium+ can use short video chat wallpapers.
- Ghost Delete is a Premium+ message deletion option.
- Users upgrade from Settings by tapping the current plan banner.
- Reelsy prioritizes privacy and fast communication.
- Reelsy is not ad-free; ads are carefully integrated to be non-intrusive.
- Reelsy Lite is a lighter version with limited features for lower-end devices.
- Reelsy runs in-app competitions with rewards — no payment required.
- Subscriptions should only be bought through the official Reelsy app to avoid fraud.
Do not request, infer, or reveal private user data, passwords, payment details, exact locations, or message contents.
`;

const HELP_CATEGORIES = ["General", "Plans & Pricing", "Privacy & Safety", "Features", "Account", "Messages"];
const HELP_SUGGESTIONS = [
  "How long do posts last?",
  "What is Ghost Delete?",
  "How do I upgrade my plan?",
  "How do I change my avatar?",
  "Is Reelsy ad-free?",
  "Can I get premium for free?",
];

const askPollinationsHelp = async (question: string, category = "General") => {
  const prompt = `${REELSY_HELP_CONTEXT}
Category: ${category}
Answer this Reelsy help question in a friendly, concise support tone (2-4 sentences max). If it asks for private data, refuse briefly.

Question: ${question}`;
  const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
  if (!response.ok) throw new Error("Help AI request failed");
  const text = await response.text();
  return text.trim().replace(/^["']|["']$/g, "");
};

const HelpCenterSheet = ({ onClose }: { onClose: () => void }) => {
  const [category, setCategory] = useState("General");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ id: number; from: "user" | "ai"; text: string }[]>([
    { id: 1, from: "ai", text: "Hi! I'm Reelsy Help AI 🤖✨\nAsk me anything about features, plans, privacy, or your account — I'm here to help!" },
  ]);
  const [isAsking, setIsAsking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isAsking]);

  const sendHelpQuestion = async (question?: string) => {
    const q = (question ?? chatInput).trim();
    if (!q || isAsking) return;
    const userMsg = { id: Date.now(), from: "user" as const, text: q };
    setChatMessages((p) => [...p, userMsg]);
    setChatInput("");
    setIsAsking(true);
    try {
      const answer = await askPollinationsHelp(q, category);
      setChatMessages((p) => [...p, { id: Date.now() + 1, from: "ai", text: answer || "I can help with Reelsy features, plans, messages, and safety." }]);
    } catch {
      setChatMessages((p) => [...p, { id: Date.now() + 1, from: "ai", text: "I couldn't reach the help service right now. Please try again in a moment or contact support from Settings." }]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col">

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3 border-b border-secondary/40">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <X className="w-4 h-4" />
        </motion.button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="font-bold text-[15px]">Help Center</p>
        </div>
        <div className="w-9" />
      </div>

      {/* Category chips */}
      <div className="shrink-0 px-4 pt-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
        {HELP_CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${category === cat ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3">
        {chatMessages.map((m, i) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i === chatMessages.length - 1 ? 0 : 0 }}
            className={`flex items-end gap-2 ${m.from === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {m.from === "ai" && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mb-0.5">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${m.from === "user" ? "bg-foreground text-background rounded-br-sm" : "bg-secondary/70 text-foreground rounded-bl-sm"}`}>
              {m.from === "ai" && (
                <p className="text-[9px] font-bold text-violet-500 uppercase tracking-wider mb-1">Reelsy AI · {category}</p>
              )}
              <p className="text-[13px] leading-relaxed whitespace-pre-line">{m.text}</p>
            </div>
          </motion.div>
        ))}

        {isAsking && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-secondary/70 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div key={i} animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18 }}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick suggestions (only when few messages) */}
        {chatMessages.length <= 2 && !isAsking && (
          <div className="pt-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5 px-1">Suggested questions</p>
            <div className="flex flex-wrap gap-2">
              {HELP_SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => sendHelpQuestion(s)}
                  className="px-3 py-1.5 rounded-full bg-secondary border border-secondary text-[11px] font-medium text-foreground hover:bg-secondary/80 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 pb-10 pt-3 border-t border-secondary/40">
        <div className="flex items-center gap-2 bg-secondary rounded-2xl px-4 py-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendHelpQuestion()}
            placeholder={`Ask about ${category.toLowerCase()}…`}
            style={{ fontSize: 14 }}
            className="flex-1 bg-transparent outline-none py-1.5"
          />
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => sendHelpQuestion()}
            disabled={isAsking || !chatInput.trim()}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white disabled:opacity-40 flex items-center justify-center shrink-0">
            <Send className="h-3.5 w-3.5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

// ---- Multi-Account Sheet ----
const MULTI_ACCOUNT_KEY = "reelsy_extra_accounts";
type SavedAccount = { id: string; username: string; displayName: string; avatar: string; tier: string; addedAt: number };

const MultiAccountSheet = ({ onClose }: { onClose: () => void }) => {
  const { user, setUser, tier, setTier } = useAppContext();

  const [accounts, setAccounts] = useState<SavedAccount[]>(() => {
    try { return JSON.parse(localStorage.getItem(MULTI_ACCOUNT_KEY) || "[]"); } catch { return []; }
  });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ username: "", displayName: "" });
  const [switching, setSwitching] = useState<string | null>(null);
  const [done, setDone] = useState("");

  const saveAccounts = (list: SavedAccount[]) => {
    localStorage.setItem(MULTI_ACCOUNT_KEY, JSON.stringify(list));
    setAccounts(list);
  };

  const addAccount = () => {
    const username = form.username.trim().replace(/^@/, "");
    const displayName = form.displayName.trim();
    if (!username || !displayName) return;
    if (accounts.find((a) => a.username === username) || username === user?.username) return;
    const seed = username + Date.now();
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4`;
    const newAcc: SavedAccount = { id: `acc-${Date.now()}`, username, displayName, avatar, tier: "free", addedAt: Date.now() };
    saveAccounts([...accounts, newAcc]);
    setForm({ username: "", displayName: "" });
    setAdding(false);
  };

  const switchAccount = (acc: SavedAccount) => {
    if (!user) return;
    // Snapshot current account back into localStorage
    const currentSnap: SavedAccount = {
      id: `acc-current-${Date.now()}`,
      username: user.username,
      displayName: user.nickname || user.username,
      avatar: typeof user.avatar === "string" && !user.avatar.startsWith("<") ? user.avatar : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
      tier,
      addedAt: Date.now(),
    };
    const remaining = accounts.filter((a) => a.id !== acc.id);
    saveAccounts([...remaining, currentSnap]);
    setSwitching(acc.id);
    setTimeout(() => {
      setUser({
        ...user,
        username: acc.username,
        nickname: acc.displayName,
        avatar: acc.avatar,
      });
      setTier(acc.tier as any);
      setSwitching(null);
      setDone(acc.displayName);
      setTimeout(onClose, 1200);
    }, 900);
  };

  const removeAccount = (id: string) => saveAccounts(accounts.filter((a) => a.id !== id));

  if (tier === "free") {
    return (
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center px-8 gap-5">
        <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="font-bold text-[17px] text-center">Multi-Account is a Pro Feature</p>
        <p className="text-[13px] text-muted-foreground text-center leading-relaxed">
          Upgrade to Premium or higher to add and seamlessly switch between multiple Reelsy accounts.
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

      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <X className="w-4 h-4" />
        </motion.button>
        <p className="font-bold text-[15px]">Accounts</p>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAdding(true)}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <Plus className="w-4 h-4" />
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-10">
        {/* Active account */}
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Active Account</p>
          <div className="bg-secondary/50 rounded-2xl px-4 py-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary">
              {user?.avatar && !user.avatar.startsWith("<")
                ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                : <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} alt="" className="w-full h-full" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[13px] truncate">{user?.nickname || user?.username}</p>
              <p className="text-[11px] text-muted-foreground">@{user?.username} · {tier}</p>
            </div>
            <Check className="w-4 h-4 shrink-0 text-emerald-500" strokeWidth={2.5} />
          </div>
        </div>

        {/* Saved accounts */}
        {accounts.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Switch to</p>
            <div className="bg-secondary/50 rounded-2xl overflow-hidden divide-y divide-background/60">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary shrink-0">
                    <img src={acc.avatar} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0" onClick={() => switchAccount(acc)}>
                    <p className="font-semibold text-[13px] truncate">{acc.displayName}</p>
                    <p className="text-[11px] text-muted-foreground">@{acc.username}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {switching === acc.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => switchAccount(acc)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-background text-[11px] font-bold">
                        <LogIn className="w-3 h-3" /> Switch
                      </motion.button>
                    )}
                    <button onClick={() => removeAccount(acc.id)} className="w-7 h-7 rounded-full bg-rose-500/10 flex items-center justify-center">
                      <X className="w-3 h-3 text-rose-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {accounts.length === 0 && !adding && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <UserCircle2 className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-[13px] text-muted-foreground">No other accounts yet.<br />Tap + to add one.</p>
          </div>
        )}

        {/* Add account form */}
        <AnimatePresence>
          {adding && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="bg-secondary/50 rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 px-1">Add Account</p>
              {[
                { key: "username", placeholder: "Username (e.g. johndoe)", type: "text" },
                { key: "displayName", placeholder: "Display name", type: "text" },
              ].map((f) => (
                <input key={f.key} type={f.type} placeholder={f.placeholder} style={{ fontSize: 14 }}
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full h-[48px] px-4 bg-background rounded-xl font-medium outline-none" />
              ))}
              <div className="flex gap-2 pt-1">
                <motion.button whileTap={{ scale: 0.97 }} onClick={addAccount}
                  disabled={!form.username.trim() || !form.displayName.trim()}
                  className="flex-1 py-3 rounded-full bg-foreground text-background font-bold text-[13px] disabled:opacity-40">
                  Add Account
                </motion.button>
                <button onClick={() => { setAdding(false); setForm({ username: "", displayName: "" }); }}
                  className="px-4 py-3 rounded-full bg-background text-[13px] font-medium">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {done && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 py-4 rounded-full bg-emerald-500 text-white font-bold text-[14px]">
              <Check className="w-5 h-5" strokeWidth={2.5} /> Switched to {done}!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ---- Contact Support Sheet ----
const ContactSupportSheet = ({ onClose }: { onClose: () => void }) => {
  const [category, setCategory] = useState("General");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  


  const categories = ["General", "Account", "Billing", "Bug Report", "Feature Request", "Privacy"];

  const SUPPORT_CONTEXT = `Reelsy support AI rules:\n- Reply as a friendly support agent.\n- Never ask for or reveal private user data, passwords, OTP codes, payment details, or exact locations.\n- If the user requests private data, refuse briefly and offer safe alternatives.\n- When responding, include: (1) what we can do next, (2) how to contact support safely, (3) a short summary of the issue the user described (paraphrase, not verbatim).`;

  const askPollinationsSupport = async (question: string) => {
    const prompt = `${SUPPORT_CONTEXT}\n\nCategory: ${category}\n\nUser message:\n${question}`;
    const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
    if (!response.ok) throw new Error("Support AI request failed");
    const text = await response.text();
    return text.trim().replace(/^['"]|['"]$/g, "");
  };

  const handleSend = async () => {
    if (!message.trim() || isAsking) return;
    setSent(true);
    setIsAsking(true);

    // locally-generated report id (client-only)
    const reportId = `r-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    try {
      const safeQuestion = message.trim();
      const answer = await askPollinationsSupport(safeQuestion);

      const payload = {
        reportId,
        category,
        userMessageSummary: safeQuestion.slice(0, 180),
        aiReply: answer,
        createdAt: Date.now(),
        read: false,
      };

      const key = "reelsy_support_notifications";
      const existingRaw = localStorage.getItem(key);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const list = Array.isArray(existing) ? existing : [];
      list.unshift(payload);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 30)));

      // nudge HomeTab bell/pill UI via a storage event for other tabs
      localStorage.setItem("reelsy_support_notifications_updatedAt", String(Date.now()));
    } catch {
      localStorage.setItem(
        "reelsy_support_notifications_fallback",
        JSON.stringify({ reportId, category, aiReply: "We could not reach the support AI right now. Please check the Help Center FAQs or try again later.", createdAt: Date.now(), read: false })
      );
    } finally {
      setIsAsking(false);
      setTimeout(onClose, 900);
    }
  };


  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <X className="w-4 h-4" />
        </motion.button>
        <p className="font-bold text-[15px]">Contact Support</p>
        <div className="w-9" />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Category</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <motion.button key={cat} whileTap={{ scale: 0.93 }} onClick={() => setCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all ${category === cat ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
                  }`}>
                {cat}
              </motion.button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Message</p>
          <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 500))}
            placeholder="Describe your issue or question..." rows={6} style={{ fontSize: 14 }}
            className="w-full px-4 py-3 bg-secondary rounded-2xl font-medium outline-none resize-none" />
          <p className="text-right text-[11px] text-muted-foreground mt-1">{message.length}/500</p>
        </div>
        <div className="bg-secondary/50 rounded-2xl p-3.5">
          <p className="text-[11px] text-muted-foreground">
            Our team typically responds within 24–48 hours. For urgent issues, include your username and ID in the message, so our team can reply to you privately in your chat. INFO: Reelsy team will not ask for any of your sensitive data but if asked restrict from answering.
          </p>
        </div>
      </div>
      <div className="shrink-0 px-4 pb-10 pt-3">
        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div key="sent" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 py-4 rounded-full bg-emerald-500 text-white font-bold text-[14px]">
              <Check className="w-5 h-5" strokeWidth={2.5} /> Message Sent!
            </motion.div>
          ) : (
            <motion.button key="btn" whileTap={{ scale: 0.97 }} onClick={handleSend} disabled={!message.trim()}
              className="w-full py-4 rounded-full bg-foreground text-background font-bold text-[14px] disabled:opacity-40">
              Send Message
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ---- Terms of Service Sheet ----
const TermsSheet = ({ onClose }: { onClose: () => void }) => (
  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
    transition={{ type: "spring", stiffness: 280, damping: 30 }}
    className="fixed inset-0 z-[100] bg-background flex flex-col">
    <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
      <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
        className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
        <X className="w-4 h-4" />
      </motion.button>
      <p className="font-bold text-[15px]">Terms of Service</p>
      <div className="w-9" />
    </div>
    <div className="flex-1 overflow-y-auto px-5 py-2 pb-8 space-y-5 text-[12px] text-muted-foreground leading-relaxed">
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">1. Acceptance of Terms</p>
        <p>By using Reelsy, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the app.</p>
      </div>
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">2. User Accounts</p>
        <p>You must be at least 13 years old to create an account. You are responsible for maintaining the confidentiality of your account credentials and all activity under your account.</p>
      </div>
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">3. Content Policy</p>
        <p>You retain ownership of content you post. You grant Reelsy a limited license to display your content within the platform. You agree not to post illegal, harmful, or deceptive content.</p>
      </div>
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">4. Privacy</p>
        <p>Reelsy does not sell your data. We collect minimal data required to operate the platform. Your messages are end-to-end encrypted. See our Privacy Policy for full details.</p>
      </div>
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">5. Subscriptions & Billing</p>
        <p>Paid plans are billed monthly. You may cancel anytime. Refunds are handled case-by-case by our support team. verified tier is invite-only and not purchasable.</p>
      </div>
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">6. Region Avaliablity</p>
        <p>Due to reasons Reelsy is not available in all countries of the world, but we will keep pushing to make it available for more countries. If your contry is among the non-region Availability, you are not authorized to use vpn due to our Terms and conditions, and if you successfully bypass reelsy ip and vpn check you risk your account being banned because Reelsy ip and vpn check gets updated frequently. You are required to use the official Reelsy Lite available in Google Playstore or wait until Reelsy is available in your country.</p>
      </div>
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">7. Termination</p>
        <p>Reelsy reserves the right to suspend or terminate accounts that violate these terms. You may delete your account at any time from Settings.</p>
      </div>
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">8. Changes to Terms</p>
        <p>We may update these terms from time to time. Continued use of Reelsy after changes constitutes acceptance of the updated terms.</p>
      </div>
      <p className="text-[11px] text-muted-foreground/60 pt-2">Last updated: January 2026 · Uraincle Ltd.</p>
    </div>
  </motion.div>
);

// ---- Rate Reelsy Sheet ----
const RateReelsySheet = ({ onClose }: { onClose: () => void }) => {
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [review, setReview] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (stars === 0) return;
    setSubmitted(true);
    setTimeout(onClose, 1800);
  };

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <X className="w-4 h-4" />
        </motion.button>
        <p className="font-bold text-[15px]">Rate Reelsy</p>
        <div className="w-9" />
      </div>
      <div className="flex-1 px-5 py-4 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <p className="text-[15px] font-semibold text-center">How's your Reelsy experience?</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <motion.button key={s} whileTap={{ scale: 0.8 }}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setStars(s)}
                animate={{ scale: (hovered || stars) >= s ? 1.18 : 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}>
                <Star
                  className="w-9 h-9"
                  strokeWidth={1.6}
                  fill={(hovered || stars) >= s ? "#f59e0b" : "none"}
                  color={(hovered || stars) >= s ? "#f59e0b" : "hsl(var(--muted-foreground))"}
                />
              </motion.button>
            ))}
          </div>
          {stars > 0 && (
            <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="text-[13px] text-muted-foreground font-medium">
              {["", "Poor", "Fair", "Good", "Great", "Excellent!"][stars]}
            </motion.p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Tell us more (optional)</p>
          <textarea value={review} onChange={(e) => setReview(e.target.value.slice(0, 300))}
            placeholder="What do you love? What could be better?" rows={4} style={{ fontSize: 14 }}
            className="w-full px-4 py-3 bg-secondary rounded-2xl font-medium outline-none resize-none" />
          <p className="text-right text-[11px] text-muted-foreground mt-1">{review.length}/300</p>
        </div>
      </div>
      <div className="shrink-0 px-4 pb-10 pt-3">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 py-4 rounded-full bg-amber-500 text-white font-bold text-[14px]">
              ⭐ Thanks for your review!
            </motion.div>
          ) : (
            <motion.button key="btn" whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={stars === 0}
              className="w-full py-4 rounded-full bg-foreground text-background font-bold text-[14px] disabled:opacity-40">
              Submit Review
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ---- Change Password Sheet ----
const ChangePasswordSheet = ({ onClose }: { onClose: () => void }) => {
  const [form, setForm] = useState({ current: "", newPass: "", confirm: "" });
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSave = () => {
    setError("");
    if (!form.current || !form.newPass) { setError("Please fill all fields."); return; }
    if (form.newPass !== form.confirm) { setError("Passwords don't match."); return; }
    if (form.newPass.length < 6) { setError("Password must be at least 6 characters."); return; }
    setDone(true);
    setTimeout(onClose, 1400);
  };

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <X className="w-4 h-4" />
        </motion.button>
        <p className="font-bold text-[15px]">Change Password</p>
        <div className="w-9" />
      </div>
      <div className="flex-1 px-5 py-2 space-y-3">
        {[
          { key: "current", label: "Current Password", placeholder: "Enter current password" },
          { key: "newPass", label: "New Password", placeholder: "At least 6 characters" },
          { key: "confirm", label: "Confirm New Password", placeholder: "Repeat new password" },
        ].map((f) => (
          <div key={f.key}>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 px-1">{f.label}</p>
            <input type="password" placeholder={f.placeholder} style={{ fontSize: 16 }}
              value={form[f.key as keyof typeof form]}
              onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
              className="w-full h-[52px] px-4 bg-secondary rounded-2xl font-medium outline-none" />
          </div>
        ))}
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-rose-500 text-[12px] font-medium px-1">{error}</motion.p>
        )}
      </div>
      <div className="shrink-0 px-4 pb-10 pt-3">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 py-4 rounded-full bg-emerald-500 text-white font-bold text-[14px]">
              <Check className="w-5 h-5" strokeWidth={2.5} /> Password Updated!
            </motion.div>
          ) : (
            <motion.button key="btn" whileTap={{ scale: 0.97 }} onClick={handleSave}
              className="w-full py-4 rounded-full bg-foreground text-background font-bold text-[14px]">
              Save Password
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};


// ---- Main SettingsTab ----
const SettingsTab = ({ onNavVisible }: { onNavVisible?: (v: boolean) => void }) => {
  const {
    user, setUser, theme, setTheme, setAppPhase, tier,
    reelsyNumber, setReelsyNumber, language, t
  } = useAppContext();
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [twoFA, setTwoFA] = useState(false);
  const [betaFeatures, setBetaFeatures] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [signOutConfirm, setSignOutConfirm] = useState(false);
  const [sheet, setSheet] = useState<"subscription" | "virtualNumber" | "editProfile" | "privacy" | "notifications" | "retention" | "language" | "help" | "support" | "terms" | "rate" | "password" | "verification" | "accounts" | null>(null);

  const tierColors: Record<string, string> = {
    free: "text-muted-foreground", premium: "text-amber-500",
    "premium+": "text-violet-500", verified: "text-yellow-500",
  };
  const tierLabels: Record<string, string> = {
    free: "Free", premium: "Premium", "premium+": "Premium+", verified: "verified",
  };
  const TierIcon = { free: Star, premium: Crown, "premium+": Flame, gold: Crown }[tier];

  const handleSignOut = async () => {
    try { await supabaseSignOut(); } catch {}
    setUser(null);
    localStorage.removeItem("reelsy_user");
    localStorage.removeItem("authToken");
    localStorage.removeItem("supabaseId");
    localStorage.removeItem("reelsy_auth_token");
    localStorage.setItem("reelsy_explicitly_logged_out", "1");
    setAppPhase("welcome");
  };

  const handleCoverSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = (e) => setUser({ ...user, coverImage: e.target?.result as string });
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <>
      <div className="absolute inset-0 flex flex-col bg-background">
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
        <div className="shrink-0 pt-4 pb-2 px-4">
          <h1 className="text-[17px] font-bold tracking-tight">{t("Settings")}</h1>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-none pb-24 px-4 space-y-4">
          {/* Profile card */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
            className="rounded-3xl overflow-hidden bg-secondary/50">
            <div
              className="h-14 bg-gradient-to-br from-secondary to-muted relative overflow-hidden"
              style={user?.coverImage ? { backgroundImage: `url(${user.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
            >
              <button onClick={() => coverInputRef.current?.click()} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/70 backdrop-blur flex items-center justify-center">
                <Camera className="w-3 h-3" />
              </button>
            </div>
            <div className="px-4 pb-4">
              <div className="flex items-end justify-between -mt-7 mb-3">
                <button onClick={() => setAvatarOpen(true)} className="relative">
                  <div className="w-14 h-14 rounded-full bg-background overflow-hidden ring-2 ring-background shadow">
                    {user?.avatar
                      ? <AvatarDisplay src={user.avatar} className="w-full h-full" />
                      : <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || "user"}`} alt="avatar" className="w-full h-full" />
                    }
                  </div>
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-foreground rounded-full flex items-center justify-center">
                    <Camera className="w-2.5 h-2.5 text-background" />
                  </div>
                </button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setSheet("editProfile")}
                  className="px-3.5 py-1.5 rounded-full bg-background text-[12px] font-semibold shadow">
                  {t("Edit Profile")}
                </motion.button>
              </div>
              <p className="font-bold text-[15px]">{user?.nickname || "Your Name"}</p>
              <p className="text-muted-foreground text-[12px] mb-1">{user?.username || "@username"}</p>
              {user?.bio && <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">{user.bio}</p>}
              <div className="grid grid-cols-3 gap-0 text-center">
                {[["128", "Posts"], ["2.4K", "Friends"], ["19K", "Mutual"]].map(([val, label]) => (
                  <div key={label}>
                    <p className="font-bold text-[14px]">{val}</p>
                    <p className="text-muted-foreground text-[10px]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Tier banner */}
          <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.04 }}
            whileTap={{ scale: 0.98 }} onClick={() => setSheet("subscription")}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-secondary/50">
            <div className="flex items-center gap-3">
              {TierIcon && <TierIcon className={`w-4 h-4 ${tierColors[tier]}`} strokeWidth={2} />}
              <div>
                <p className="font-semibold text-[13px]">{tierLabels[tier]} Plan</p>
                <p className="text-[11px] text-muted-foreground">{tier === "free" ? "Upgrade for more features" : "Active subscription"}</p>
              </div>
            </div>
            {tier === "free" ? (
              <span className="px-2.5 py-1 rounded-full bg-foreground text-background text-[11px] font-bold">Upgrade</span>
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </motion.button>



          {/* Appearance */}
          <Section title={t("Appearance")} delay={0.08}>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                {theme === "dark" ? <Moon className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} /> : <Sun className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />}
                <div>
                  <p className="font-semibold text-[13px]">{t("Dark Mode")}</p>
                  <p className="text-[11px] text-muted-foreground">{theme === "dark" ? t("Enabled") : t("Disabled")}</p>
                </div>
              </div>
              <Toggle value={theme === "dark"} onChange={() => setTheme(theme === "dark" ? "light" : "dark")} />
            </div>
          </Section>

          {/* Account */}
          <Section title={t("Account")} delay={0.1}>
            <SettingRow icon={User} label={t("Edit Profile")} onPress={() => setSheet("editProfile")} />
            <SettingRow icon={Mail} label={t("Email")} value={user?.email ? user.email.replace(/(.{2}).*(@.*)/, "$1…$2") : undefined} />
            <PhoneNumberRow />
            <SettingRow icon={Users} label="Accounts" value={tier === "free" ? "Pro" : undefined} onPress={() => setSheet("accounts")} />
            <SettingRow icon={VerifiedIcon} label={t("Get Verified Badge")} onPress={() => setSheet("verification")} />
            <SettingRow icon={Shield} label={t("Privacy")} onPress={() => setSheet("privacy")} />
          </Section>

          {/* Preferences */}
          <Section title={t("Preferences")} delay={0.12}>
            <SettingRow icon={Bell} label={t("Notifications")} onPress={() => setSheet("notifications")} />
            <SettingRow icon={Globe} label={t("Language")} value={language} onPress={() => setSheet("language")} />
            <SettingRow icon={Clock} label={t("Post Retention")} onPress={() => setSheet("retention")}
              value={tier === "free" ? "24 hours" : undefined} />
          </Section>

          {/* Security */}
          <Section title={t("Security")} delay={0.14}>
            <SettingRow icon={Lock} label={t("Change Password")} onPress={() => setSheet("password")} />
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
                <div>
                  <p className="font-medium text-[13px]">{t("Two-Factor Auth")}</p>
                  <p className="text-[11px] text-muted-foreground">{twoFA ? t("Enabled") : t("Disabled")}</p>
                </div>
              </div>
              <Toggle value={twoFA} onChange={() => setTwoFA(!twoFA)} />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <Crown className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
                <div>
                  <p className="font-medium text-[13px]">{t("Beta Features")}</p>
                  <p className="text-[11px] text-muted-foreground">Early access to new stuff</p>
                </div>
              </div>
              <Toggle value={betaFeatures} onChange={() => setBetaFeatures(!betaFeatures)} />
            </div>
          </Section>

          {/* Storage */}
          <Section title={t("Storage")} delay={0.16}>
            <div className="px-4 py-3.5">
              <div className="flex justify-between items-baseline mb-2">
                <span className="font-medium text-[13px]">{t("App Storage")}</span>
                <span className="text-[11px] text-muted-foreground">1.4 GB of 5 GB used</span>
              </div>
              <div className="h-1.5 bg-background rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: "28%" }}
                  transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                  className="h-full rounded-full bg-foreground" />
              </div>
            </div>
          </Section>

          {/* About */}
          <Section title={t("About")} delay={0.18}>
            <SettingRow icon={HelpCircle} label={t("Help Center")} onPress={() => setSheet("help")} />
            <SettingRow icon={MessageSquare} label={t("Contact Support")} onPress={() => setSheet("support")} />
            <SettingRow icon={FileText} label={t("Terms of Service")} onPress={() => setSheet("terms")} />
            <SettingRow icon={Star} label={t("Rate Reelsy")} onPress={() => setSheet("rate")} />
          </Section>

          <p className="text-center text-[11px] text-muted-foreground pt-1">Reelsy v2.5.0 · Made by Uraincle</p>

          <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.22 }}
            whileTap={{ scale: 0.97 }} onClick={() => setSignOutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-rose-500/10 text-rose-500 font-semibold text-[13px]">
            <LogOut className="w-4 h-4" strokeWidth={2} /> {t("Sign Out")}
          </motion.button>
        </div>

        {/* Sign out confirm */}
        <AnimatePresence>
          {signOutConfirm && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[60]" onClick={() => setSignOutConfirm(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 450, damping: 28 }}
                className="absolute bottom-12 left-4 right-4 z-[70] bg-background rounded-3xl overflow-hidden shadow-2xl">
                <div className="px-5 py-5 border-b border-secondary/40 text-center">
                  <p className="font-bold text-[15px] mb-1">Sign out?</p>
                  <p className="text-[12px] text-muted-foreground">You can sign back in anytime.</p>
                </div>
                <button onClick={handleSignOut} className="w-full py-4 text-[14px] font-semibold text-rose-500 border-b border-secondary/40">{t("Sign Out")}</button>
                <button onClick={() => setSignOutConfirm(false)} className="w-full py-4 text-[14px] font-semibold">Cancel</button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Avatar picker */}
      <AnimatePresence>
        {avatarOpen && (
          <AvatarCustomizer onClose={() => setAvatarOpen(false)} onSave={(url) => {
            setUser(user ? { ...user, avatar: url } : null);
            setAvatarOpen(false);
          }} />
        )}
      </AnimatePresence>

      {/* Sheets */}
      <AnimatePresence>
        {sheet === "subscription" && <SubscriptionModal onClose={() => setSheet(null)} />}
        {sheet === "virtualNumber" && <VirtualNumberModal onClose={() => setSheet(null)} onSave={(num) => { setReelsyNumber(num); setSheet(null); }} />}
        {sheet === "editProfile" && <EditProfileSheet onClose={() => setSheet(null)} />}
        {sheet === "privacy" && <PrivacySheet onClose={() => setSheet(null)} />}
        {sheet === "notifications" && <NotificationsSheet onClose={() => setSheet(null)} />}
        {sheet === "retention" && <PostRetentionSheet onClose={() => setSheet(null)} />}
        {sheet === "language" && <LanguageSheet onClose={() => setSheet(null)} />}
        {sheet === "help" && <HelpCenterSheet onClose={() => setSheet(null)} />}
        {sheet === "support" && <ContactSupportSheet onClose={() => setSheet(null)} />}
        {sheet === "terms" && <TermsSheet onClose={() => setSheet(null)} />}
        {sheet === "rate" && <RateReelsySheet onClose={() => setSheet(null)} />}
        {sheet === "password" && <ChangePasswordSheet onClose={() => setSheet(null)} />}
        {sheet === "accounts" && <MultiAccountSheet onClose={() => setSheet(null)} />}
        {sheet === "verification" && <VerificationModal onClose={() => setSheet(null)} onSubmit={() => {}} onApproved={(approved) => { if (user && approved) setUser({ ...user, verified: true }); setSheet(null); }} />}
      </AnimatePresence>
    </>
  );
};

export default SettingsTab;
