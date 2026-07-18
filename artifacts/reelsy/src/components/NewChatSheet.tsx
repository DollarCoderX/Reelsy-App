/**
 * NewChatSheet — slide-up sheet for starting a new DM conversation.
 *
 * Sections:
 *  1. Friends — mutual friends, with "Chatting" badge if already in DMs
 *  2. Phone number search — country-code selector + number input
 *
 * On selecting anyone, calls onStartChat(username, displayName, avatar).
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Phone, Users, ChevronRight, Loader2, UserCheck, ChevronDown } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

interface FriendEntry {
  username: string;
  displayName: string;
  avatar: string;
  isAlreadyMessaging?: boolean;
}

interface NewChatSheetProps {
  existingChatUsernames: string[];
  onStartChat: (username: string, displayName: string, avatar: string) => void;
  onClose: () => void;
}

// ── Country code list ─────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: "+1",   flag: "🇺🇸", name: "US / Canada",   minDigits: 10 },
  { code: "+44",  flag: "🇬🇧", name: "UK",             minDigits: 10 },
  { code: "+234", flag: "🇳🇬", name: "Nigeria",        minDigits: 10 },
  { code: "+27",  flag: "🇿🇦", name: "South Africa",   minDigits: 9  },
  { code: "+233", flag: "🇬🇭", name: "Ghana",          minDigits: 9  },
  { code: "+254", flag: "🇰🇪", name: "Kenya",          minDigits: 9  },
  { code: "+255", flag: "🇹🇿", name: "Tanzania",       minDigits: 9  },
  { code: "+256", flag: "🇺🇬", name: "Uganda",         minDigits: 9  },
  { code: "+251", flag: "🇪🇹", name: "Ethiopia",       minDigits: 9  },
  { code: "+250", flag: "🇷🇼", name: "Rwanda",         minDigits: 9  },
  { code: "+49",  flag: "🇩🇪", name: "Germany",        minDigits: 10 },
  { code: "+33",  flag: "🇫🇷", name: "France",         minDigits: 9  },
  { code: "+34",  flag: "🇪🇸", name: "Spain",          minDigits: 9  },
  { code: "+39",  flag: "🇮🇹", name: "Italy",          minDigits: 10 },
  { code: "+31",  flag: "🇳🇱", name: "Netherlands",    minDigits: 9  },
  { code: "+46",  flag: "🇸🇪", name: "Sweden",         minDigits: 9  },
  { code: "+47",  flag: "🇳🇴", name: "Norway",         minDigits: 8  },
  { code: "+91",  flag: "🇮🇳", name: "India",          minDigits: 10 },
  { code: "+86",  flag: "🇨🇳", name: "China",          minDigits: 11 },
  { code: "+81",  flag: "🇯🇵", name: "Japan",          minDigits: 10 },
  { code: "+82",  flag: "🇰🇷", name: "South Korea",    minDigits: 9  },
  { code: "+55",  flag: "🇧🇷", name: "Brazil",         minDigits: 10 },
  { code: "+52",  flag: "🇲🇽", name: "Mexico",         minDigits: 10 },
  { code: "+61",  flag: "🇦🇺", name: "Australia",      minDigits: 9  },
  { code: "+64",  flag: "🇳🇿", name: "New Zealand",    minDigits: 9  },
  { code: "+971", flag: "🇦🇪", name: "UAE",            minDigits: 9  },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia",   minDigits: 9  },
  { code: "+20",  flag: "🇪🇬", name: "Egypt",          minDigits: 10 },
  { code: "+212", flag: "🇲🇦", name: "Morocco",        minDigits: 9  },
];

export const NewChatSheet = ({ existingChatUsernames, onStartChat, onClose }: NewChatSheetProps) => {
  const { user } = useAppContext();
  const username = user?.username?.replace(/^@/, "") ?? "";

  const [search, setSearch] = useState("");
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  // Phone search
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [phoneResult, setPhoneResult] = useState<FriendEntry | null | "not_found" | "searching">(null);
  const phoneDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load friends list
  useEffect(() => {
    if (!username) return;
    setLoadingFriends(true);
    fetch(`/api/friends/${username}`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.friends ?? []);
        setFriends(list.map((f: any) => ({
          username: f.username || f.friend_username || "",
          displayName: f.displayName || f.friend_display_name || f.username || "",
          avatar: f.profileImage || f.friend_avatar || f.avatar || "",
        })));
      })
      .catch(() => {})
      .finally(() => setLoadingFriends(false));
  }, [username]);

  // Phone search
  useEffect(() => {
    if (phoneDigits.length < countryCode.minDigits) {
      setPhoneResult(null);
      return;
    }
    if (phoneDebounce.current) clearTimeout(phoneDebounce.current);
    setPhoneResult("searching");
    const fullNumber = `${countryCode.code}${phoneDigits}`;
    phoneDebounce.current = setTimeout(() => {
      fetch(`/api/auth/search-by-phone?phone=${encodeURIComponent(fullNumber)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.found && data?.username) {
            setPhoneResult({ username: data.username, displayName: data.displayName || data.username, avatar: data.profileImage || "" });
          } else {
            setPhoneResult("not_found");
          }
        })
        .catch(() => setPhoneResult("not_found"));
    }, 700);
    return () => { if (phoneDebounce.current) clearTimeout(phoneDebounce.current); };
  }, [phoneDigits, countryCode]);

  const filteredFriends = friends.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return f.username.toLowerCase().includes(q) || f.displayName.toLowerCase().includes(q);
  });

  const filteredCountries = COUNTRY_CODES.filter((c) =>
    !countrySearch || c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch)
  );

  return (
    <>
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="fixed inset-0 z-[90] bg-background flex flex-col"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3 border-b border-secondary/30">
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </motion.button>
          <p className="font-bold text-[16px]">New Chat</p>
          <div className="w-9" />
        </div>

        <div className="flex-1 overflow-y-auto overscroll-none pb-10">
          {/* Search friends */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center gap-2 bg-secondary/50 rounded-2xl px-3 py-2.5">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search friends…"
                className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* ── Friends ── */}
          <div className="px-4 pt-2">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">Friends</p>
            </div>

            {loadingFriends && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loadingFriends && filteredFriends.length === 0 && (
              <p className="text-[13px] text-muted-foreground text-center py-4">
                {search ? "No friends match that search" : "No friends yet — add people from their profiles"}
              </p>
            )}

            <div className="space-y-1">
              {filteredFriends.map((f) => {
                const alreadyChat = existingChatUsernames.includes(f.username);
                return (
                  <motion.button key={f.username} whileTap={{ scale: 0.97 }}
                    onClick={() => { onStartChat(f.username, f.displayName, f.avatar); onClose(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-secondary/50 transition-colors">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary shrink-0">
                      {f.avatar
                        ? <img src={f.avatar} alt={f.displayName} className="w-full h-full object-cover" />
                        : <img src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${f.username}&backgroundColor=b6e3f4`} alt={f.displayName} className="w-full h-full object-cover" />
                      }
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-semibold text-[13px] truncate">{f.displayName}</p>
                      <p className="text-[11px] text-muted-foreground">@{f.username}</p>
                    </div>
                    {alreadyChat ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 shrink-0">
                        <UserCheck className="w-3 h-3" /> Chatting
                      </span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ── Phone number search ── */}
          <div className="px-4 pt-5">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">By Phone Number</p>
            </div>

            {/* Country code + number input row */}
            <div className="flex items-center gap-2">
              {/* Country code picker button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { setShowCountryPicker(true); setCountrySearch(""); }}
                className="flex items-center gap-1.5 bg-secondary/60 rounded-2xl px-3 py-3 shrink-0"
              >
                <span className="text-[16px]">{countryCode.flag}</span>
                <span className="text-[13px] font-semibold">{countryCode.code}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </motion.button>

              {/* Number input */}
              <div className="flex-1 flex items-center bg-secondary/50 rounded-2xl px-3 py-2.5">
                <input
                  value={phoneDigits}
                  onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  placeholder={`${countryCode.minDigits}-digit number`}
                  inputMode="numeric"
                  className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
                />
                {phoneDigits.length > 0 && (
                  <button onClick={() => { setPhoneDigits(""); setPhoneResult(null); }}
                    className="ml-1 text-muted-foreground active:scale-90 transition-transform">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Full number hint */}
            {phoneDigits.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1.5 px-1">
                Searching: <span className="font-semibold">{countryCode.code}{phoneDigits}</span>
              </p>
            )}

            {/* Results */}
            <AnimatePresence>
              {phoneResult === "searching" && (
                <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 py-3 px-1">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <p className="text-[13px] text-muted-foreground">Searching…</p>
                </motion.div>
              )}
              {phoneResult === "not_found" && (
                <motion.div key="nf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="py-3 px-1">
                  <p className="text-[13px] text-muted-foreground">No Reelsy user found with that number.</p>
                </motion.div>
              )}
              {phoneResult && typeof phoneResult === "object" && (() => {
                const isYou = phoneResult.username.replace(/^@/, "").toLowerCase() === username.toLowerCase();
                return (
                  <motion.div key="found" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`w-full flex items-center gap-3 mt-2 px-3 py-2.5 rounded-2xl bg-secondary/40 border border-secondary ${isYou ? "opacity-70" : ""}`}>
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary shrink-0">
                      {phoneResult.avatar
                        ? <img src={phoneResult.avatar} alt={phoneResult.displayName} className="w-full h-full object-cover" />
                        : <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${phoneResult.username}&backgroundColor=b6e3f4`} alt={phoneResult.displayName} className="w-full h-full object-cover" />
                      }
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-[13px]">
                        {phoneResult.displayName}
                        {isYou && <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">(you)</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground">@{phoneResult.username}</p>
                    </div>
                    {isYou
                      ? <span className="text-[12px] font-medium text-muted-foreground shrink-0">That's you</span>
                      : <button
                          onClick={() => { onStartChat(phoneResult.username, phoneResult.displayName, phoneResult.avatar); onClose(); }}
                          className="text-[12px] font-bold text-blue-500 shrink-0">Message →</button>
                    }
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Country code picker sheet */}
      <AnimatePresence>
        {showCountryPicker && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/50" onClick={() => setShowCountryPicker(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="fixed inset-x-0 bottom-0 z-[101] bg-background rounded-t-[28px] flex flex-col"
              style={{ maxHeight: "70%" }}
            >
              <div className="shrink-0 px-4 pt-4 pb-3 border-b border-secondary/30">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-[15px]">Select Country Code</p>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowCountryPicker(false)}
                    className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>
                <div className="flex items-center gap-2 bg-secondary/50 rounded-2xl px-3 py-2">
                  <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Search country…"
                    autoFocus
                    className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredCountries.map((c) => (
                  <motion.button key={c.code} whileTap={{ backgroundColor: "hsl(var(--secondary)/0.5)" }}
                    onClick={() => { setCountryCode(c); setShowCountryPicker(false); setPhoneDigits(""); setPhoneResult(null); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${c.code === countryCode.code ? "bg-secondary/40" : ""}`}>
                    <span className="text-[20px] w-7 shrink-0">{c.flag}</span>
                    <span className="flex-1 text-left text-[13px] font-medium">{c.name}</span>
                    <span className="text-[13px] font-bold text-muted-foreground shrink-0">{c.code}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
