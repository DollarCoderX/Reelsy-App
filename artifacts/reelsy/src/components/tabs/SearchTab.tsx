import { useEffect, useState } from "react";
import { Search as SearchIcon, Grid, List, X, Building2, UserPlus, Clock, Users, Loader2, Globe2, ShieldAlert, Home } from "lucide-react";
import reelsyLogo from "@assets/j.png";
import { motion, AnimatePresence } from "framer-motion";
import {
  AUTONOMOUS_BOT_IDS,
  BOTS,
  acceptBotFriendRequest,
  getBotAvatarUrl,
  isAutonomousBotId,
  readFriendBotIds,
} from "@/data/bots";

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

const SUGGESTED_PEOPLE = [
  { name: "Alex Okafor", handle: "@alexo", role: "Product Designer", seed: "Alex", mutual: "12 mutual" },
  { name: "Sam Park", handle: "@sampark", role: "Full Stack Engineer", seed: "Sam", mutual: "5 mutual" },
  { name: "Zara Williams", handle: "@zaraw", role: "Creative Director", seed: "Zara", mutual: "18 mutual" },
  { name: "Jordan Lee", handle: "@jordanl", role: "Illustrator", seed: "Jordan", mutual: "3 mutual" },
];

const AUTONOMOUS_BOT_PEOPLE = BOTS
  .filter((bot) => (AUTONOMOUS_BOT_IDS as readonly string[]).includes(bot.id))
  .map((bot) => ({
    name: bot.name,
    handle: bot.handle,
    role: bot.role,
    seed: bot.seed,
    mutual: "auto-accepts",
    botId: bot.id,
    avatarUrl: getBotAvatarUrl(bot),
  }));

const COMPANIES: Record<string, { name: string; industry: string; employees: string; founded: string; bio: string; verified: boolean }> = {
  apple: { name: "Apple Inc.", industry: "Consumer Technology", employees: "160,000+", founded: "1976", bio: "Technology company known for iPhone, Mac, and software services.", verified: true },
  google: { name: "Google LLC", industry: "Internet & Software", employees: "180,000+", founded: "1998", bio: "Search engine and technology company powering the open web.", verified: true },
  meta: { name: "Meta Platforms", industry: "Social Media", employees: "86,000+", founded: "2004", bio: "Social technology company building the future of connection.", verified: true },
  spotify: { name: "Spotify", industry: "Music Streaming", employees: "9,800+", founded: "2006", bio: "Audio streaming and podcast platform with 600M+ users.", verified: true },
  reelsy: { name: "Reelsy", industry: "Social Media", employees: "50+", founded: "2025", bio: "The social app built for real people. No ads, no algorithms.", verified: true },
  uraincle: { name: "Uraincle", industry: "Technology", employees: "12", founded: "2024", bio: "The company behind Reelsy. Building the next generation of social.", verified: true },
};

type FriendStatus = "none" | "requested" | "friends";

const ADULT_TERMS = ["sex", "porn", "porno", "nude", "nudes", "xxx", "nsfw", "erotic", "adult"];

const getMockResults = (q: string) => {
  const clean = q.trim();
  if (!clean) return [];
  const results = [
    { type: "People", title: `${clean} creators`, meta: "Profiles posting about this topic" },
    { type: "Posts", title: `Latest posts for ${clean}`, meta: "Fresh mock results from Reelsy" },
    { type: "Tags", title: `#${clean.replace(/\s+/g, "").toLowerCase()}`, meta: "Trending tag suggestion" },
  ];
  
  // Add smart suggestions based on search terms
  if (clean.toLowerCase().includes("music") || clean.toLowerCase().includes("song")) {
    results.push({ type: "Music", title: `Music featuring ${clean}`, meta: "Search Reelsy's music library" });
  }
  if (clean.toLowerCase().includes("video")) {
    results.push({ type: "Videos", title: `Videos about ${clean}`, meta: "Trending video content" });
  }
  if (clean.toLowerCase().includes("live")) {
    results.push({ type: "Live", title: `Live streams: ${clean}`, meta: "Active live broadcasts" });
  }
  
  return results;
};

const SearchTab = ({ onOpenThread, onGoHome }: { onOpenThread?: (id: string) => void; onGoHome?: () => void }) => {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [category, setCategory] = useState("All");
  const [gridMode, setGridMode] = useState(false);
  const [recents, setRecents] = useState(["design systems", "afrobeats", "Zara Williams"]);
  const [friendStatus, setFriendStatus] = useState<Record<string, FriendStatus>>(() => {
    const friendIds = readFriendBotIds();
    return AUTONOMOUS_BOT_PEOPLE.reduce<Record<string, FriendStatus>>((acc, person) => {
      if (friendIds.includes(person.botId)) acc[person.handle] = "friends";
      return acc;
    }, {});
  });
  const [companyResult, setCompanyResult] = useState<typeof COMPANIES[string] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [adultAllowedQuery, setAdultAllowedQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<{ query: string; timestamp: number; category: string }[]>(() => {
    const saved = localStorage.getItem("reelsy_search_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [filters, setFilters] = useState({ verified: false, premium: false, liked: false });

  const normalizedQuery = query.trim().toLowerCase();
  const isAdultQuery = ADULT_TERMS.some((term) => new RegExp(`\\b${term}\\b`, "i").test(normalizedQuery));
  const adultBlocked = normalizedQuery.length > 0 && isAdultQuery && adultAllowedQuery !== normalizedQuery;
  const mockResults = getMockResults(query);
  const peopleYouMayKnow = [...AUTONOMOUS_BOT_PEOPLE, ...SUGGESTED_PEOPLE];
  const matchingAutoBots = normalizedQuery
    ? AUTONOMOUS_BOT_PEOPLE.filter((person) =>
      [person.name, person.handle, person.role].some((value) => value.toLowerCase().includes(normalizedQuery))
    )
    : [];

  useEffect(() => {
    if (!normalizedQuery || adultBlocked) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => setIsSearching(false), 650);
    return () => clearTimeout(timer);
  }, [normalizedQuery, adultBlocked]);

  const removeRecent = (term: string) => setRecents((p) => p.filter((r) => r !== term));

  const saveToHistory = (q: string, cat: string) => {
    if (!q.trim()) return;
    const updated = [
      { query: q.trim(), timestamp: Date.now(), category: cat },
      ...searchHistory.filter(h => h.query !== q.trim()),
    ].slice(0, 20); // Keep last 20 searches
    setSearchHistory(updated);
    localStorage.setItem("reelsy_search_history", JSON.stringify(updated));
  };
  const handleSearch = (q: string) => {
    setQuery(q);
    const key = q.toLowerCase().trim();
    if (key !== adultAllowedQuery) setAdultAllowedQuery("");
    const match = COMPANIES[key] || Object.values(COMPANIES).find((c) => c.name.toLowerCase().includes(key));
    setCompanyResult(q.length > 1 ? match || null : null);
  };

  const cycleFriend = (person: { handle: string; botId?: string }) => {
    setFriendStatus((p) => {
      const curr = p[person.handle] || "none";
      if (person.botId && isAutonomousBotId(person.botId)) {
        if (curr === "friends") return p;
        acceptBotFriendRequest(person.botId);
        return { ...p, [person.handle]: "friends" };
      }
      return { ...p, [person.handle]: curr === "none" ? "requested" : curr === "requested" ? "none" : "none" };
    });
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-background">
      {/* Search bar */}
      <div className="shrink-0 px-4 pt-4 pb-2">
        <div className="relative flex items-center">
          <SearchIcon className="absolute left-3.5 w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
          <input placeholder="Search Reelsy" value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            style={{ fontSize: 16 }}
            className="w-full pl-10 pr-10 py-2.5 bg-secondary rounded-xl font-medium outline-none" />
          {query && (
            <button onClick={() => { setQuery(""); setCompanyResult(null); setAdultAllowedQuery(""); }} className="absolute right-3">
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
              category === cat ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
            }`}>{cat}</motion.button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none pb-24 px-4">
        {/* Recent searches */}
        <AnimatePresence>
          {focused && recents.length > 0 && !query && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mb-4 mt-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Recent</p>
              <div className="flex flex-wrap gap-2">
                {recents.map((r) => (
                  <div key={r} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary">
                    <button onClick={() => { setQuery(r); setFocused(false); handleSearch(r); }}
                      className="text-[12px] font-medium">{r}</button>
                    <button onClick={() => removeRecent(r)}><X className="w-3 h-3 text-muted-foreground ml-0.5" /></button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active search state */}
        <AnimatePresence mode="wait">
          {adultBlocked ? (
            <motion.div key="adult-warning" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mt-2 mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15">
                  <ShieldAlert className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <p className="font-bold text-[14px]">This content is rated 18+</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                    This content is rated 18+ and not safe for viewers less than 18.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setQuery("");
                    setCompanyResult(null);
                    setAdultAllowedQuery("");
                    onGoHome?.();
                  }}
                  className="flex-1 rounded-full bg-secondary py-2.5 text-[12px] font-semibold"
                >
                  <Home className="mr-1 inline h-3.5 w-3.5" />
                  Home feed
                </button>
                <button
                  onClick={() => setAdultAllowedQuery(normalizedQuery)}
                  className="flex-1 rounded-full bg-foreground py-2.5 text-[12px] font-semibold text-background"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          ) : normalizedQuery ? (
            <motion.div key="searching" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mt-2 mb-4 rounded-2xl bg-secondary/60 p-3">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background">
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-[12px] font-semibold">
                    {isSearching ? `Searching for ${query.trim()}` : `Results for ${query.trim()}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Scanning the Reelsy world</p>
                </div>
              </div>
              {!isSearching && (
                <div className="space-y-1.5">
                  {mockResults.map((result) => (
                    <button key={`${result.type}-${result.title}`} className="w-full rounded-xl bg-background/70 px-3 py-2 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{result.type}</p>
                      <p className="text-[13px] font-semibold">{result.title}</p>
                      <p className="text-[11px] text-muted-foreground">{result.meta}</p>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Company result card */}
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
                  <p className="text-[11px] text-muted-foreground">{companyResult.employees} employees</p>
                  <p className="text-[12px] mt-1.5 leading-relaxed">{companyResult.bio}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reelsy Bot quick result */}
        {!adultBlocked && !isSearching && query.trim().length > 0 && (query.toLowerCase().includes("reelsy bot") || query.toLowerCase().includes("reelsybot")) && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }} onClick={() => { onOpenThread?.("reelsy-bot"); }}
            className="mb-4 p-3 rounded-2xl bg-secondary/60 cursor-pointer">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-foreground text-background flex items-center justify-center shrink-0">
                <img src={reelsyLogo} alt="Reelsy Bot" className="w-7 h-7 object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-[14px]">Reelsy Bot</p>
                </div>
                <p className="text-[11px] text-muted-foreground">AI assistant — send .menu to open bot commands</p>
              </div>
            </div>
          </motion.div>
        )}

        {!adultBlocked && !isSearching && matchingAutoBots.length > 0 && (
          <div className="mb-4 space-y-2">
            {matchingAutoBots.map((person) => {
              const status = friendStatus[person.handle] || "none";
              return (
                <motion.div key={person.handle} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2.5 rounded-2xl bg-secondary/60 p-3">
                  <img src={person.avatarUrl} alt={person.name} className="h-11 w-11 rounded-full bg-secondary object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold">{person.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{person.handle} - {person.role}</p>
                  </div>
                  <motion.button whileTap={{ scale: 0.92 }} onClick={() => cycleFriend(person)}
                    className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                      status === "friends" ? "bg-secondary text-foreground" : "bg-foreground text-background"
                    }`}>
                    {status === "friends" ? <><Users className="h-3 w-3" /> Friends</> : <><UserPlus className="h-3 w-3" /> Add</>}
                  </motion.button>
                  {status === "friends" && (
                    <motion.button whileTap={{ scale: 0.92 }} onClick={() => onOpenThread?.(person.botId)}
                      className="shrink-0 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-semibold text-background">
                      Chat
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Trending */}
        {!normalizedQuery && (category === "All" || category === "Posts" || category === "Tags") && (
          <>
            <div className="flex items-center justify-between mt-2 mb-3">
              <p className="font-semibold text-[13px]">Trending</p>
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
              <div className="mb-6">
                {TRENDING.map((t, i) => (
                  <motion.button key={t.topic} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }} whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center gap-3 py-3 text-left">
                    <div className="w-10 h-10 rounded-xl bg-secondary overflow-hidden shrink-0">
                      <img src={t.img} alt={t.topic} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">{i + 1} · {t.category}</p>
                      <p className="font-semibold text-[13px]">{t.topic}</p>
                      <p className="text-[11px] text-muted-foreground">{t.posts} posts</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </>
        )}

        {/* People — "Add Friend" system */}
        {!normalizedQuery && (category === "All" || category === "People") && (
          <div>
            <p className="font-semibold text-[13px] mb-3">People you may know</p>
            <div className="space-y-3">
              {peopleYouMayKnow.map((p) => {
                const status = friendStatus[p.handle] || "none";
                const avatar = "avatarUrl" in p && typeof p.avatarUrl === "string"
                  ? p.avatarUrl
                  : `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.seed}&backgroundColor=b6e3f4`;
                return (
                  <motion.div key={p.handle} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5">
                    <img src={avatar}
                      alt={p.name} className="w-10 h-10 rounded-full bg-secondary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[13px] truncate">{p.name}</p>
                      <p className="text-muted-foreground text-[11px] truncate">
                        {p.handle} · <span className="text-foreground/60">{p.mutual}</span>
                      </p>
                    </div>
                    <motion.button whileTap={{ scale: 0.92 }} onClick={() => cycleFriend(p)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all shrink-0 ${
                        status === "none" ? "bg-foreground text-background"
                        : status === "requested" ? "bg-secondary text-muted-foreground"
                        : "bg-secondary text-foreground"
                      }`}>
                      {status === "none" && <><UserPlus className="w-3 h-3" /> Add</>}
                      {status === "requested" && <><Clock className="w-3 h-3" /> Sent</>}
                      {status === "friends" && <><Users className="w-3 h-3" /> Friends</>}
                    </motion.button>
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
