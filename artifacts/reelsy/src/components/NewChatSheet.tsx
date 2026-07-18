/**
 * NewChatSheet — slide-up sheet for starting a new DM conversation.
 *
 * Three sections:
 *  1. Friends — people you're already mutual friends with (not in DM list yet)
 *  2. Requests sent — people you've friended but haven't accepted back
 *  3. Phone number search — enter a number and if it's registered, message them
 *
 * On selecting anyone, it calls onStartChat(username, displayName, avatar).
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Phone, Users, UserPlus, ChevronRight, Loader2, UserCheck } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { api } from "@/lib/api";

interface FriendEntry {
  username: string;
  displayName: string;
  avatar: string;
  isAlreadyMessaging?: boolean;
}

interface NewChatSheetProps {
  /** DM conversation usernames already in the message list (to show "Already Chatting" state) */
  existingChatUsernames: string[];
  onStartChat: (username: string, displayName: string, avatar: string) => void;
  onClose: () => void;
}

export const NewChatSheet = ({ existingChatUsernames, onStartChat, onClose }: NewChatSheetProps) => {
  const { user } = useAppContext();
  const username = user?.username?.replace(/^@/, "") ?? "";

  const [search, setSearch] = useState("");
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  // Phone search
  const [phone, setPhone] = useState("");
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

  // Phone number search with debounce
  useEffect(() => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      setPhoneResult(null);
      return;
    }
    if (phoneDebounce.current) clearTimeout(phoneDebounce.current);
    setPhoneResult("searching");
    phoneDebounce.current = setTimeout(() => {
      fetch(`/api/auth/search-by-phone?phone=${encodeURIComponent(cleaned)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.username) {
            setPhoneResult({ username: data.username, displayName: data.displayName || data.username, avatar: data.profileImage || "" });
          } else {
            setPhoneResult("not_found");
          }
        })
        .catch(() => setPhoneResult("not_found"));
    }, 600);
    return () => { if (phoneDebounce.current) clearTimeout(phoneDebounce.current); };
  }, [phone]);

  const filtered = friends.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return f.username.toLowerCase().includes(q) || f.displayName.toLowerCase().includes(q);
  });

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="fixed inset-0 z-[90] bg-background flex flex-col"
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3 border-b border-secondary/30">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-9 h-9 rounded-full bg-secondary/60 flex items-center justify-center">
          <X className="w-4 h-4" />
        </motion.button>
        <p className="font-bold text-[16px]">New Chat</p>
        <div className="w-9" />
      </div>

      {/* Search bar */}
      <div className="shrink-0 px-4 py-2.5 border-b border-secondary/20">
        <div className="flex items-center gap-2 bg-secondary/50 rounded-2xl px-3.5 py-2.5">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search friends…"
            autoComplete="off"
            style={{ fontSize: 16 }}
            className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none pb-8">

        {/* ── Phone number search ── */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-2.5">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">By Phone Number</p>
          </div>
          <div className="flex items-center gap-2 bg-secondary/40 rounded-2xl px-4 py-3">
            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              value={formatPhone(phone)}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="+1 234 567 8900"
              inputMode="tel"
              style={{ fontSize: 16 }}
              className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-muted-foreground/50"
            />
            {phone.length > 0 && (
              <button onClick={() => { setPhone(""); setPhoneResult(null); }}
                className="w-5 h-5 rounded-full bg-muted-foreground/40 flex items-center justify-center shrink-0">
                <X className="w-3 h-3 text-background" />
              </button>
            )}
          </div>

          <AnimatePresence>
            {phoneResult === "searching" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-1 pt-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-[13px] text-muted-foreground">Looking up number…</span>
              </motion.div>
            )}
            {phoneResult === "not_found" && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="px-1 pt-3">
                <p className="text-[13px] text-muted-foreground">No Reelsy account found for this number.</p>
              </motion.div>
            )}
            {phoneResult && typeof phoneResult === "object" && (
              <motion.button
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { onStartChat((phoneResult as FriendEntry).username, (phoneResult as FriendEntry).displayName, (phoneResult as FriendEntry).avatar); onClose(); }}
                className="w-full flex items-center gap-3 bg-foreground/5 border border-secondary/60 rounded-2xl px-4 py-3.5 mt-3 text-left"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-400 to-blue-400 flex items-center justify-center text-white font-bold text-[16px] shrink-0 overflow-hidden">
                  {(phoneResult as FriendEntry).avatar
                    ? <img src={(phoneResult as FriendEntry).avatar} alt="" className="w-full h-full object-cover" />
                    : (phoneResult as FriendEntry).displayName?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14px] truncate">{(phoneResult as FriendEntry).displayName}</p>
                  <p className="text-[12px] text-muted-foreground truncate">@{(phoneResult as FriendEntry).username}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="mx-4 my-3 border-t border-secondary/30" />

        {/* ── Friends list ── */}
        <div className="px-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Users className="w-4 h-4 text-muted-foreground" />
            <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">Friends</p>
          </div>

          {loadingFriends && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loadingFriends && filtered.length === 0 && (
            <div className="text-center py-8">
              <UserPlus className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-[14px] font-semibold text-muted-foreground">
                {search.trim() ? "No friends match your search" : "No friends yet"}
              </p>
              <p className="text-[12px] text-muted-foreground/60 mt-1">
                {search.trim() ? "Try a different name" : "Add friends to start chatting with them"}
              </p>
            </div>
          )}

          <div className="space-y-1">
            {filtered.map((friend) => {
              const alreadyChatting = existingChatUsernames.includes(friend.username);
              return (
                <motion.button
                  key={friend.username}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { onStartChat(friend.username, friend.displayName, friend.avatar); onClose(); }}
                  className="w-full flex items-center gap-3 px-2 py-3 rounded-2xl hover:bg-secondary/40 transition-colors active:bg-secondary/60 text-left"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-blue-400 shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-[18px]">
                    {friend.avatar
                      ? <img src={friend.avatar} alt={friend.displayName} className="w-full h-full object-cover" />
                      : friend.displayName?.[0]?.toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14px] truncate">{friend.displayName}</p>
                    <p className="text-[12px] text-muted-foreground truncate">@{friend.username}</p>
                  </div>

                  {/* State badge */}
                  {alreadyChatting ? (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/60 shrink-0">
                      <UserCheck className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground font-medium">Chatting</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-foreground text-background shrink-0">
                      <span className="text-[11px] font-bold">Chat</span>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default NewChatSheet;
