import { useEffect, useState, useCallback, useRef } from "react";
import { Search as SearchIcon, Grid, List, X, Building2, Clock, Users, Loader2, Globe2, ShieldAlert, Home, UserPlus, UserCheck, Check, ShieldOff } from "lucide-react";
import reelsyLogo from "@assets/j.png";
import { motion, AnimatePresence } from "framer-motion";
import {
  AUTONOMOUS_BOT_IDS, BOTS, acceptBotFriendRequest, getBotAvatarUrl, isAutonomousBotId, readFriendBotIds,
} from "@/data/bots";
import { api, UserProfile } from "@/lib/api";
import { useFriends } from "@/hooks/useFriends";
import { useAppContext } from "@/context/AppContext";
import { LottieEmoji } from "@/components/LottieEmoji";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import UserProfileModal from "@/components/UserProfile";

const CATEGORIES = ["All", "People", "Posts", "Companies", "Tags"];

const TRENDING = [
  { topic: "Design Systems", posts: "12.4K", category: "Technology", img: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=200&auto=format&fit=crop" },
  { topic: "Afrobeats 2026", posts: "48.1K", category: "Music", img: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&auto=format&fit=crop" },
  { topic: "UI/UX Tips", posts: "24.5K", category: "Design", img: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=200&auto=format&fit=crop" },
  { topic: "React 19", posts: "8.2K", category: "Technology", img: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=200&auto=format&fit=crop" },
  { topic: "Minimalism", posts: "5.1K", category: "Lifestyle", img: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=200&auto=format&fit=crop" },
  { topic: "AI Tools", posts: "67.2K", category: "Technology", img: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=200&auto=format&fit=crop" },
  { topic: "Streetwear", posts: "19.3K", category: "Fashion", img: "https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=200&auto=format&fit=crop" },
  { topic: "Mental Wellness", posts: "11.8K", category: "Health", img: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=200&auto=format&fit=crop" },
];

const COMPANIES: Record<string, { name: string; industry: string; employees: string; founded: string; bio: string; verified: boolean }> = {
  apple: { name: "Apple Inc.", industry: "Consumer Technology", employees: "160,000+", founded: "1976", bio: "Technology company known for iPhone, Mac, and software services.", verified: true },
  google: { name: "Google LLC", industry: "Internet & Software", employees: "180,000+", founded: "1998", bio: "Search engine and technology company powering the open web.", verified: true },
  meta: { name: "Meta Platforms", industry: "Social Media", employees: "86,000+", founded: "2004", bio: "Social technology company building the future of connection.", verified: true },
  reelsy: { name: "Reelsy", industry: "Social Media", employees: "50+", founded: "2025", bio: "The social app built for real people. No ads, no algorithms.", verified: true },
};

const AUTONOMOUS_BOT_PEOPLE = BOTS
  .filter((bot) => (AUTONOMOUS_BOT_IDS as readonly string[]).includes(bot.id))
  .map((bot) => ({ name: bot.name, handle: bot.handle, role: bot.role, seed: bot.seed, botId: bot.id, avatarUrl: getBotAvatarUrl(bot), isBot: true }));

const ADULT_TERMS = ["sex", "porn", "porno", "nude", "nudes", "xxx", "nsfw", "erotic", "adult"];

type BotFriendStatus = "none" | "requested" | "friends";

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

const SearchTab = ({ onOpenThread, onGoHome }: { onOpenThread?: (id: string) => void; onGoHome?: () => void }) => {
  const { user } = useAppContext();
  const { sendRequest, statusCache, loading: friendLoading, acceptRequest, declineRequest, getStatus } = useFriends();
  const [actionToast, setActionToast] = useState<string>("");
  const { isOnline } = useOnlinePresence(user?.username || undefined);

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [category, setCategory] = useState("All");
  const [gridMode, setGridMode] = useState(false);
  const [recents, setRecents] = useState(["design systems", "afrobeats", "Zara Williams"]);
  const [companyResult, setCompanyResult] = useState<typeof COMPANIES[string] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [adultAllowedQuery, setAdultAllowedQuery] = useState("");
  const [realUsers, setRealUsers] = useState<UserProfile[]>([]);
  const [realUsersLoading, setRealUsersLoading] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [viewingRealUser, setViewingRealUser] = useState<UserProfile | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bot friend status (local, for bots only)
  const [botFriendStatus, setBotFriendStatus] = useState<Record<string, BotFriendStatus>>(() => {
    const friendIds = readFriendBotIds();
    return AUTONOMOUS_BOT_PEOPLE.reduce<Record<string, BotFriendStatus>>((acc, person) => {
      if (friendIds.includes(person.botId)) acc[person.handle] = "friends";
      return acc;
    }, {});
  });

  const normalizedQuery = query.trim().toLowerCase();
  const isAdultQuery = ADULT_TERMS.some((term) => new RegExp(`\\b${term}\\b`, "i").test(normalizedQuery));
  const adultBlocked = normalizedQuery.length > 0 && isAdultQuery && adultAllowedQuery !== normalizedQuery;

  // Preload friend status for all real users when search results change
  useEffect(() => {
    if (!realUsers.length || !user?.username) return;
    realUsers.forEach((u) => {
      if (u.username !== user.username && !statusCache[u.username]) {
        getStatus(u.username).catch(() => {});
      }
    });
  }, [realUsers, user?.username]);

  // Search real users with debounce
  useEffect(() => {
    if (!normalizedQuery || adultBlocked) {
      setRealUsers([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      setRealUsersLoading(true);
      try {
        const { users } = await api.users.search(normalizedQuery, 15);
        // Exclude self
        const filtered = users.filter(u => u.username !== user?.username);
        setRealUsers(filtered);
      } catch {
        setRealUsers([]);
      } finally {
        setRealUsersLoading(false);
        setIsSearching(false);
      }
    }, 500);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [normalizedQuery, adultBlocked, user?.username]);

  const removeRecent = (term: string) => setRecents((p) => p.filter((r) => r !== term));

  const handleSearch = (q: string) => {
    setQuery(q);
    const key = q.toLowerCase().trim();
    if (key !== adultAllowedQuery) setAdultAllowedQuery("");
    const match = COMPANIES[key] || Object.values(COMPANIES).find((c) => c.name.toLowerCase().includes(key));
    setCompanyResult(q.length > 1 ? match || null : null);
  };

  const handleBotFriendCycle = (person: { handle: string; botId: string }) => {
    setBotFriendStatus((p) => {
      const curr = p[person.handle] || "none";
      if (isAutonomousBotId(person.botId)) {
        if (curr === "friends") return p;
        acceptBotFriendRequest(person.botId);
        return { ...p, [person.handle]: "friends" };
      }
      return { ...p, [person.handle]: curr === "none" ? "requested" : curr === "requested" ? "none" : "none" };
    });
  };

  const handleRealFriendAction = useCallback(async (targetUser: UserProfile) => {
    // Prevent self-actions
    if (targetUser.username === user?.username) return;
    const state = statusCache[targetUser.username];
    const status = state?.status || "none";
    if (status === "none") {
      await sendRequest(targetUser.username);
    } else if (status === "request_sent" && state?.requestId) {
      await declineRequest(state.requestId, targetUser.username);
    } else if (status === "request_received" && state?.requestId) {
      await acceptRequest(state.requestId, targetUser.username);
    }
    // "friends" → could unfriend, but keep simple for now
  }, [statusCache, sendRequest, declineRequest, acceptRequest, user?.username]);

  const showToast = useCallback((msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(""), 3000);
  }, []);

  const handleBlock = useCallback(async (targetUsername: string) => {
    if (!user?.username || targetUsername === user.username) return;
    try {
      await api.blocks.block(user.username, targetUsername);
      setBlockedUsers((prev) => new Set([...prev, targetUsername]));
      showToast(`You blocked @${targetUsername}`);
    } catch {}
  }, [user?.username, showToast]);

  const handleUnblock = useCallback(async (targetUsername: string) => {
    if (!user?.username) return;
    try {
      await api.blocks.unblock(user.username, targetUsername);
      setBlockedUsers((prev) => { const s = new Set(prev); s.delete(targetUsername); return s; });
    } catch {}
  }, [user?.username]);

  // Button label/style — Friend model language
  const getFollowButtonInfo = (username: string) => {
    if (blockedUsers.has(username)) {
      return { icon: <ShieldOff className="w-3 h-3" />, label: "Blocked", style: "bg-secondary/60 text-muted-foreground border border-secondary" };
    }
    const status = statusCache[username]?.status || "none";
    if (status === "friends") return { icon: <UserCheck className="w-3 h-3" />, label: "Friends", style: "bg-secondary text-foreground border border-secondary" };
    if (status === "request_sent") return { icon: <Clock className="w-3 h-3" />, label: "Pending", style: "bg-secondary text-muted-foreground border border-secondary" };
    if (status === "request_received") return { icon: <Check className="w-3 h-3" />, label: "Accept", style: "bg-green-600 text-white border border-green-600" };
    return { icon: <UserPlus className="w-3 h-3" />, label: "Add Friend", style: "bg-foreground text-background border border-foreground" };
  };

  const matchingAutoBots = normalizedQuery
    ? AUTONOMOUS_BOT_PEOPLE.filter((p) =>
        [p.name, p.handle, p.role].some((v) => v.toLowerCase().includes(normalizedQuery))
      )
    : [];

  return (
    <div className="absolute inset-0 flex flex-col bg-background">
      {/* Block / action toast */}
      <AnimatePresence>
        {actionToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-5 py-2.5 text-[13px] font-semibold text-background shadow-lg"
          >
            {actionToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="shrink-0 px-4 pt-5 pb-2">
        <h1 className="text-[22px] font-black mb-3 tracking-tight">Search</h1>
        <div className="relative flex items-center">
          <SearchIcon className="absolute left-3.5 w-4 h-4 text-muted-foreground" strokeWidth={2} />
          <input
            placeholder="Search..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            style={{ fontSize: 16 }}
            className="w-full pl-10 pr-10 py-2.5 bg-secondary/80 rounded-2xl font-medium outline-none text-[14px]"
          />
          {query && (
            <button onClick={() => { setQuery(""); setCompanyResult(null); setAdultAllowedQuery(""); setRealUsers([]); }} className="absolute right-3">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Category pills */}
      <div className="shrink-0 flex gap-2 px-4 py-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {CATEGORIES.map((cat) => (
          <motion.button key={cat} whileTap={{ scale: 0.93 }} onClick={() => setCategory(cat)}
            className={`shrink-0 px-3.5 py-1 rounded-full text-[12px] font-semibold transition-all ${
              category === cat ? "bg-foreground text-background" : "bg-secondary/60 text-muted-foreground"
            }`}>{cat}</motion.button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none pb-24 px-4">
        {/* Recent searches */}
        <AnimatePresence>
          {focused && recents.length > 0 && !query && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-4 mt-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">Recent</p>
              <div className="flex flex-wrap gap-2">
                {recents.map((r) => (
                  <div key={r} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary/60 border border-secondary">
                    <button onClick={() => { setQuery(r); setFocused(false); handleSearch(r); }} className="text-[12px] font-medium">{r}</button>
                    <button onClick={() => removeRecent(r)}><X className="w-3 h-3 text-muted-foreground ml-0.5" /></button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Adult content warning */}
        <AnimatePresence mode="wait">
          {adultBlocked ? (
            <motion.div key="adult" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mt-2 mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15">
                  <ShieldAlert className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <p className="font-bold text-[14px]">This content is rated 18+</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">This content is not safe for viewers under 18.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setQuery(""); setAdultAllowedQuery(""); onGoHome?.(); }}
                  className="flex-1 rounded-full bg-secondary py-2.5 text-[12px] font-semibold">
                  <Home className="mr-1 inline h-3.5 w-3.5" /> Home feed
                </button>
                <button onClick={() => setAdultAllowedQuery(normalizedQuery)}
                  className="flex-1 rounded-full bg-foreground py-2.5 text-[12px] font-semibold text-background">Continue</button>
              </div>
            </motion.div>
          ) : normalizedQuery ? (
            <motion.div key="searching-state" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mt-2 mb-3 rounded-2xl bg-secondary/40 p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-background">
                  {isSearching || realUsersLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe2 className="h-3.5 w-3.5" />}
                </div>
                <p className="text-[12px] font-semibold">
                  {isSearching ? `Searching for "${query.trim()}"...` : `Results for "${query.trim()}"`}
                </p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ── Real user results (Instagram-style) ── */}
        <AnimatePresence>
          {!adultBlocked && !isSearching && !realUsersLoading && realUsers.length > 0 && (category === "All" || category === "People") && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">People</p>
              <div className="divide-y divide-secondary/40">
                {realUsers.map((u, idx) => {
                  const btnInfo = getFollowButtonInfo(u.username);
                  const isLoading = friendLoading[u.username];
                  const isBlocked = blockedUsers.has(u.username);
                  const online = isOnline(u.username);
                  return (
                    <motion.div
                      key={u._id || u.username}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="flex items-center gap-3 py-3"
                    >
                      {/* Avatar — tappable to open profile */}
                      <button
                        className="relative shrink-0"
                        onClick={() => setViewingRealUser(u)}
                      >
                        <div
                          className="h-[52px] w-[52px] rounded-full bg-secondary overflow-hidden flex items-center justify-center text-[18px] font-bold"
                          style={{
                            backgroundImage: u.profileImage ? `url(${u.profileImage})` : undefined,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        >
                          {!u.profileImage && (u.displayName?.[0] || u.username?.[0] || "?")}
                        </div>
                        {online && (
                          <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                        )}
                      </button>

                      {/* Info — tappable to open profile */}
                      <button className="min-w-0 flex-1 text-left" onClick={() => setViewingRealUser(u)}>
                        <p className="truncate text-[14px] font-bold leading-tight">{u.username}</p>
                        <p className="truncate text-[12px] text-muted-foreground leading-tight mt-0.5">
                          {u.displayName && u.displayName !== u.username ? u.displayName : u.bio || "Reelsy user"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatFollowers(u.followersCount ?? 0)} friends
                        </p>
                      </button>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!isBlocked ? (
                          <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => handleRealFriendAction(u)}
                            disabled={isLoading}
                            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all disabled:opacity-70 ${btnInfo.style}`}
                          >
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : btnInfo.icon}
                            {btnInfo.label}
                          </motion.button>
                        ) : (
                          <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => handleUnblock(u.username)}
                            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold bg-secondary/60 text-muted-foreground border border-secondary"
                          >
                            <ShieldOff className="w-3 h-3" />
                            Unblock
                          </motion.button>
                        )}
                        {/* Block option (3-dot or long-press could trigger this, for now a discreet block button) */}
                        {!isBlocked && (
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleBlock(u.username)}
                            className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-secondary/60 transition-colors"
                            title="Block user"
                          >
                            <ShieldOff className="w-3.5 h-3.5" />
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bot results in search */}
        {!adultBlocked && !isSearching && matchingAutoBots.length > 0 && (category === "All" || category === "People") && (
          <div className="mb-4">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Suggested</p>
            <div className="divide-y divide-secondary/40">
              {matchingAutoBots.map((person) => {
                const status = botFriendStatus[person.handle] || "none";
                return (
                  <motion.div key={person.handle} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 py-3">
                    <img src={person.avatarUrl} alt={person.name} className="h-[52px] w-[52px] rounded-full bg-secondary object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold">{person.handle.replace("@", "")}</p>
                      <p className="truncate text-[12px] text-muted-foreground">{person.name} · {person.role}</p>
                      <p className="text-[11px] text-muted-foreground">auto-accepts</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <motion.button whileTap={{ scale: 0.92 }} onClick={() => handleBotFriendCycle(person)}
                        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold border transition-all ${
                          status === "friends"
                            ? "bg-secondary text-foreground border-secondary"
                            : "bg-foreground text-background border-foreground"
                        }`}>
                        {status === "friends" ? <><UserCheck className="h-3 w-3" /> Friends</> : <><UserPlus className="h-3 w-3" /> Add Friend</>}
                      </motion.button>
                      {status === "friends" && (
                        <motion.button whileTap={{ scale: 0.92 }} onClick={() => onOpenThread?.(person.botId)}
                          className="shrink-0 rounded-full bg-secondary border border-secondary px-3 py-1.5 text-[12px] font-semibold">Message</motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reelsy Bot quick result */}
        {!adultBlocked && !isSearching && query.trim().length > 0 && (query.toLowerCase().includes("reelsy bot") || query.toLowerCase().includes("reelsybot")) && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }} onClick={() => onOpenThread?.("reelsy-bot")}
            className="mb-4 p-3 rounded-2xl bg-secondary/60 cursor-pointer">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-foreground text-background flex items-center justify-center shrink-0">
                <img src={reelsyLogo} alt="Reelsy Bot" className="w-7 h-7 object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[14px]">Reelsy Bot</p>
                <p className="text-[11px] text-muted-foreground">AI assistant — send .menu to open bot commands</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Company results */}
        <AnimatePresence>
          {companyResult && !adultBlocked && !isSearching && (
            <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }} className="mb-4 p-4 rounded-2xl bg-secondary/60">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-foreground text-background flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-[14px]">{companyResult.name}</p>
                    {companyResult.verified && (
                      <div className="w-4 h-4 rounded-full bg-foreground flex items-center justify-center shrink-0">
                        <span className="text-background text-[8px] font-black">✓</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{companyResult.industry} · Founded {companyResult.founded}</p>
                  <p className="text-[12px] mt-1.5 leading-relaxed">{companyResult.bio}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trending */}
        {!normalizedQuery && (category === "All" || category === "Posts" || category === "Tags") && (
          <>
            <div className="flex items-center justify-between mt-2 mb-3">
              <p className="font-bold text-[14px]">Trending</p>
              <div className="flex gap-1">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setGridMode(false)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${!gridMode ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}>
                  <List className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setGridMode(true)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${gridMode ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}>
                  <Grid className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </div>
            {gridMode ? (
              <div className="grid grid-cols-2 gap-2.5 mb-6">
                {TRENDING.map((t, i) => (
                  <motion.button key={t.topic} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }} whileTap={{ scale: 0.97 }}
                    className="relative rounded-2xl overflow-hidden aspect-square bg-secondary">
                    <img src={t.img} alt={t.topic} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2.5">
                      <p className="font-bold text-[12px] text-white">{t.topic}</p>
                      <p className="text-[10px] text-white/70">{t.posts} posts</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="mb-6 divide-y divide-secondary/30">
                {TRENDING.map((t, i) => (
                  <motion.button key={t.topic} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }} whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center gap-3 py-3 text-left">
                    <div className="w-10 h-10 rounded-xl bg-secondary overflow-hidden shrink-0">
                      <img src={t.img} alt={t.topic} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground mb-0.5">{i + 1} · {t.category}</p>
                      <p className="font-bold text-[13px] truncate">{t.topic}</p>
                      <p className="text-[11px] text-muted-foreground">{t.posts} posts</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </>
        )}

        {/* People you may know */}
        {!normalizedQuery && (category === "All" || category === "People") && (
          <div className="mb-6">
            <p className="font-bold text-[14px] mb-3">People you may know</p>
            <div className="divide-y divide-secondary/30">
              {AUTONOMOUS_BOT_PEOPLE.map((p) => {
                const status = botFriendStatus[p.handle] || "none";
                return (
                  <motion.div key={p.handle} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 py-3">
                    <img src={p.avatarUrl} alt={p.name} className="w-[52px] h-[52px] rounded-full bg-secondary object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[14px] truncate">{p.handle.replace("@", "")}</p>
                      <p className="text-muted-foreground text-[12px] truncate">{p.name}</p>
                      <p className="text-muted-foreground text-[11px]">Suggested · auto-accepts</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <motion.button whileTap={{ scale: 0.92 }} onClick={() => handleBotFriendCycle(p)}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                          status === "none" ? "bg-foreground text-background border-foreground"
                          : status === "requested" ? "bg-secondary text-muted-foreground border-secondary"
                          : "bg-secondary text-foreground border-secondary"
                        }`}>
                        {status === "none" && <><UserPlus className="w-3 h-3" /> Follow</>}
                        {status === "requested" && <><Clock className="w-3 h-3" /> Requested</>}
                        {status === "friends" && <><UserCheck className="w-3 h-3" /> Following</>}
                      </motion.button>
                      {status === "friends" && (
                        <motion.button whileTap={{ scale: 0.92 }} onClick={() => onOpenThread?.(p.botId)}
                          className="shrink-0 rounded-full bg-secondary border border-secondary px-3 py-1.5 text-[12px] font-semibold">Message</motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchTab;
