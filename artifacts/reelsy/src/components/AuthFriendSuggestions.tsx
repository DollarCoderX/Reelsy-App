import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { ChevronLeft, Check, UserPlus, Loader2 } from "lucide-react";
import { AUTONOMOUS_BOT_IDS, BOTS, acceptBotFriendRequest } from "@/data/bots";
import { api } from "@/lib/api";

type SuggestedPerson = {
  id: string;
  botId?: string;
  name: string;
  handle: string;
  role: string;
  avatarUrl: string;
  isReal?: boolean;
};

// Bot fallbacks (shown if API has no users yet)
const BOT_SUGGESTIONS: SuggestedPerson[] = BOTS
  .filter((bot) => (AUTONOMOUS_BOT_IDS as readonly string[]).includes(bot.id))
  .map((bot, index) => ({
    id: `auto-${bot.id}`,
    botId: bot.id,
    name: bot.name,
    handle: bot.handle,
    role: bot.role,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${bot.seed}&backgroundColor=${{ 0: "b6e3f4", 1: "c0aede", 2: "d1d4f9", 3: "ffd5dc" }[index] || "b6e3f4"}`,
  }));

const AuthFriendSuggestions = () => {
  const { setAppPhase, user } = useAppContext();
  const [selected, setSelected] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const maxFriends = 4;

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        // Fetch top 6 real users from the API
        const res = await api.users.getSuggestions(user?.username || "", 8);
        const realUsers = (res?.users || [])
          .filter((u: any) => u.username && u.username !== user?.username)
          .slice(0, 6)
          .map((u: any): SuggestedPerson => ({
            id: u._id || u.username,
            name: u.nickname || u.displayName || u.username,
            handle: `@${u.username}`,
            role: u.bio?.slice(0, 40) || u.role || "Reelsy member",
            avatarUrl:
              u.avatar ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}&backgroundColor=b6e3f4`,
            isReal: true,
          }));

        // Fill up with bots if we have < 4 real users
        const combined = realUsers.length >= 4
          ? realUsers
          : [...realUsers, ...BOT_SUGGESTIONS.slice(0, 6 - realUsers.length)];

        setSuggestions(combined);
      } catch {
        // Fallback to bots if API fails
        setSuggestions(BOT_SUGGESTIONS);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [user?.username]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxFriends) return prev;
      return [...prev, id];
    });
  };

  const handleNext = async () => {
    // Process bot follows
    selected.forEach((id) => {
      const person = suggestions.find((p) => p.id === id);
      if (person?.botId) acceptBotFriendRequest(person.botId);
    });

    // Send friend requests to real users
    if (user?.username) {
      const realSelected = selected
        .map((id) => suggestions.find((p) => p.id === id))
        .filter((p): p is SuggestedPerson => !!p?.isReal);

      await Promise.allSettled(
        realSelected.map((p) =>
          api.friends.sendRequest({
            fromUserId: user.supabaseId || user.username || "",
            fromUsername: user.username?.replace(/^@/, "") || "",
            fromDisplayName: user.nickname || user.username || "",
            fromAvatar: user.avatar,
            toUsername: p.handle.replace(/^@/, ""),
          })
        )
      );
    }

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
            Friend up to {maxFriends} people to start your feed.{" "}
            {selected.length > 0 && (
              <span className="font-semibold text-foreground">{selected.length}/{maxFriends} selected</span>
            )}
          </p>
        </motion.div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1">
            {suggestions.map((person, i) => {
              const isSelected = selected.includes(person.id);
              const isDisabled = !isSelected && selected.length >= maxFriends;
              return (
                <motion.button
                  key={person.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 350, damping: 24, delay: i * 0.04 }}
                  whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                  onClick={() => !isDisabled && toggle(person.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all ${
                    isSelected ? "bg-foreground/8" : ""
                  } ${isDisabled ? "opacity-40" : ""}`}
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-secondary shrink-0 ring-2 ring-background">
                    <img
                      src={person.avatarUrl}
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
        )}
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
