import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { ChevronLeft, Check, UserPlus } from "lucide-react";
import { AUTONOMOUS_BOT_IDS, BOTS, acceptBotFriendRequest } from "@/data/bots";

const SUGGESTED_FRIENDS = [
  ...BOTS
    .filter((bot) => (AUTONOMOUS_BOT_IDS as readonly string[]).includes(bot.id))
    .map((bot, index) => ({
      id: `auto-${bot.id}`,
      botId: bot.id,
      name: bot.name,
      handle: bot.handle,
      role: bot.role,
      style: bot.style,
      seed: bot.seed,
      bg: ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc"][index] || "b6e3f4",
    })),
  { id: "1",  name: "Dev-Lord",       handle: "@dev-lord",   role: "Professional Coder",      style: "avataaars", seed: "Amara",   bg: "b6e3f4" },
  { id: "2",  name: "Reelsy",         handle: "@reelsy",     role: "Company",                style: "lorelei",   seed: "Jay",     bg: "c0aede" },
  { id: "3",  name: "Nova Reeves",    handle: "@nova_r",     role: "Illustrator",            style: "micah",     seed: "Nova",    bg: "d1d4f9" },
  { id: "4",  name: "Kabil345",       handle: "@kabil-jacob", role: "Filmmaker",              style: "adventurer",seed: "Kofi",    bg: "ffd5dc" },
  { id: "5",  name: "Priya Nair",     handle: "@priyanair",  role: "UI/UX Designer",         style: "fun-emoji", seed: "Priya",   bg: "ffdfbf" },
  { id: "6",  name: "Zara Williams",  handle: "@zaraw",      role: "Fashion Blogger",        style: "avataaars", seed: "Zara",    bg: "b6e3f4" },
  { id: "7",  name: "Marcus Bell",    handle: "@marcusb",    role: "Photographer",           style: "lorelei",   seed: "Marcus",  bg: "c0aede" },
  { id: "8",  name: "Selin Celik",    handle: "@selin_c",    role: "Startup Founder",        style: "micah",     seed: "Selin",   bg: "d1d4f9" },
  { id: "9",  name: "Dami Bello",     handle: "@damib",      role: "Afrobeats Artist",       style: "bottts",    seed: "Dami",    bg: "ffd5dc" },
  { id: "10", name: "Leo Park",       handle: "@leopark",    role: "Tech Journalist",        style: "pixel-art", seed: "Leo",     bg: "ffdfbf" },
  { id: "11", name: "Yemi Cole",      handle: "@yemi_c",     role: "Wellness Coach",         style: "avataaars", seed: "Yemi",    bg: "b6e3f4" },
  { id: "12", name: "Sam Eze",        handle: "@sameze",     role: "Software Engineer",      style: "lorelei",   seed: "Sam",     bg: "c0aede" },
  { id: "13", name: "Riya Shah",      handle: "@riyashah",   role: "Product Manager",        style: "micah",     seed: "Riya",    bg: "d1d4f9" },
  { id: "14", name: "Andre Dubois",   handle: "@andred",     role: "Chef & Food Writer",     style: "adventurer",seed: "Andre",   bg: "ffd5dc" },
  { id: "15", name: "Kezia Mwangi",   handle: "@kezia_m",    role: "Environmental Activist", style: "fun-emoji", seed: "Kezia",   bg: "ffdfbf" },
  { id: "16", name: "Tom Briggs",     handle: "@tombriggs",  role: "Comedian",               style: "avataaars", seed: "Tom",     bg: "b6e3f4" },
  { id: "17", name: "Nina Volkov",    handle: "@ninavolkov", role: "Artist & Painter",       style: "lorelei",   seed: "Nina",    bg: "c0aede" },
  { id: "18", name: "Chidi Okeke",    handle: "@chidio",     role: "Sports Analyst",         style: "micah",     seed: "Chidi",   bg: "d1d4f9" },
  { id: "19", name: "Layla Hassan",   handle: "@laylah",     role: "Travel Vlogger",         style: "bottts",    seed: "Layla",   bg: "ffd5dc" },
  { id: "20", name: "Finn Matthews",  handle: "@finnm",      role: "Game Developer",         style: "pixel-art", seed: "Finn",    bg: "ffdfbf" },
];

const avatarUrl = (style: string, seed: string, bg: string) =>
  `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=${bg}`;

const AuthFriendSuggestions = () => {
  const { setAppPhase } = useAppContext();
  const [selected, setSelected] = useState<string[]>([]);
  const maxFriends = 4;

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxFriends) return prev;
      return [...prev, id];
    });
  };

  const handleNext = () => {
    selected.forEach((id) => {
      const friend = SUGGESTED_FRIENDS.find((person) => person.id === id);
      if (friend && "botId" in friend) acceptBotFriendRequest(friend.botId);
    });
    setAppPhase("auth-permissions");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute inset-0 flex flex-col bg-background text-foreground"
    >
      <div className="shrink-0 px-4 pt-5">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAppPhase("auth-interests")}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>
      </div>

      <div className="shrink-0 px-7 pt-5 pb-3">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-[26px] font-bold tracking-tight">Add some friends</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Bfriend up to {maxFriends} people to start your feed.{" "}
            {selected.length > 0 && (
              <span className="font-semibold text-foreground">{selected.length}/{maxFriends} selected</span>
            )}
          </p>
        </motion.div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none px-4 pb-4">
        <div className="space-y-1">
          {SUGGESTED_FRIENDS.map((person, i) => {
            const isSelected = selected.includes(person.id);
            const isDisabled = !isSelected && selected.length >= 3;
            return (
              <motion.button
                key={person.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 24, delay: i * 0.022 }}
                whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                onClick={() => !isDisabled && toggle(person.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all ${
                  isSelected ? "bg-foreground/8" : ""
                } ${isDisabled ? "opacity-40" : ""}`}
              >
                <div className="w-11 h-11 rounded-full overflow-hidden bg-secondary shrink-0 ring-2 ring-background">
                  <img
                    src={avatarUrl(person.style, person.seed, person.bg)}
                    alt={person.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] truncate">{person.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {person.handle} · {person.role}
                  </p>
                </div>
                <AnimatePresence mode="wait">
                  {isSelected ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 24 }}
                      className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="add"
                      initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="shrink-0 px-7 pb-10 pt-4 space-y-2">
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleNext}
          className="w-full py-4 rounded-full bg-foreground text-background font-semibold text-[15px] shadow-sm transition-opacity">
          {selected.length === 0 ? "Skip for now" : `Follow ${selected.length} ${selected.length === 1 ? "person" : "people"}`}
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default AuthFriendSuggestions;
