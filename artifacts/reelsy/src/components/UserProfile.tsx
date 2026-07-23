import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark,
  Check,
  ChevronLeft,
  Flag,
  Heart,
  Mail,
  MessageCircle,
  MoreVertical,
  Play,
  Share2,
  UserX,
  UserPlus,
  Users,
  Loader2,
  Repeat2,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Bot } from "@/data/bots";
import {
  acceptBotFriendRequest,
  getBotAvatarUrl,
  isAutonomousBotId,
  readFriendBotIds,
} from "@/data/bots";
import { api, UserProfile as ApiUserProfile } from "@/lib/api";
import { useFriends } from "@/hooks/useFriends";
import { useAppContext } from "@/context/AppContext";

// Track which profiles were viewed this session to avoid duplicate notifications
const viewedThisSession = new Set<string>();

interface UserProfileProps {
  bot?: Bot | null;
  realUser?: ApiUserProfile | null;
  onClose: () => void;
  onChat?: (bot: Bot) => void;
  onMessage?: (user: ApiUserProfile) => void;
}

type FriendStatus = "none" | "requested" | "friends";
type ProfileTab = "posts" | "friends";

const BOT_COVERS = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&auto=format&fit=crop",
];

const REAL_USER_COVERS = [
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1200&auto=format&fit=crop",
];

const profilePostText = (name: string, role: string) =>
  `${role} is not just a title. It is how ${name.split(" ")[0]} notices small details, builds a point of view, and turns simple ideas into something people can feel.`;

const coverForBot = (id: string) => {
  const index = id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % BOT_COVERS.length;
  return BOT_COVERS[index];
};

const coverForUser = (username: string) => {
  const index = username.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % REAL_USER_COVERS.length;
  return REAL_USER_COVERS[index];
};

// ─────────────────────────────────────────────────────────────────────────────
// Real User Profile
// ─────────────────────────────────────────────────────────────────────────────
const RealUserProfileView = ({
  realUser,
  onClose,
  onMessage,
}: {
  realUser: ApiUserProfile;
  onClose: () => void;
  onMessage?: (user: ApiUserProfile) => void;
}) => {
  const { user: me, setPendingDmUser } = useAppContext();
  const { sendRequest, statusCache, loading: friendLoading, acceptRequest, declineRequest, getStatus } = useFriends();
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState<{ friendCount: number; postCount: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [realPosts, setRealPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [friends, setFriends] = useState<ApiUserProfile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [isStartingDm, setIsStartingDm] = useState(false);

  const isMe = me?.username === realUser.username;
  const friendState = statusCache[realUser.username];
  const friendStatus = friendState?.status || "none";
  const isLoading = friendLoading[realUser.username] || false;

  useEffect(() => {
    getStatus(realUser.username).catch(() => {});
    api.users.getStats(realUser.username)
      .then((data) => setStats(data))
      .catch(() => {});

    // Fetch posts by this user
    setPostsLoading(true);
    (api.posts as any).getFeed({ limit: 20, username: realUser.username })
      .then((res: any) => {
        setRealPosts(res?.posts || []);
      })
      .catch(() => {})
      .finally(() => setPostsLoading(false));

    // Fire profile_view notification
    if (!isMe && me?.supabaseId && realUser.supabaseId && !viewedThisSession.has(realUser.username)) {
      viewedThisSession.add(realUser.username);
      api.engagement.notifyProfileView({
        viewerUserId: me.supabaseId,
        viewerUsername: me.username || "",
        viewerDisplayName: me.nickname || me.username || "",
        viewerProfileImage: me.avatar || undefined,
        profileOwnerId: realUser.supabaseId,
        profileOwnerUsername: realUser.username,
      }).catch(() => {});
    }
  }, [realUser.username]);

  useEffect(() => {
    if (activeTab === "friends" && friends.length === 0 && !friendsLoading) {
      setFriendsLoading(true);
      api.friends.getFriends(realUser.username)
        .then((res) => setFriends(res.friends || []))
        .catch(() => {})
        .finally(() => setFriendsLoading(false));
    }
  }, [activeTab, realUser.username]);

  const handleFriendAction = async () => {
    if (isMe) return;
    if (friendStatus === "none") {
      await sendRequest(realUser.username);
    } else if (friendStatus === "request_sent" && friendState?.requestId) {
      await declineRequest(friendState.requestId, realUser.username);
    } else if (friendStatus === "request_received" && friendState?.requestId) {
      await acceptRequest(friendState.requestId, realUser.username);
    }
  };

  const friendLabel =
    friendStatus === "friends" ? "Friends" :
    friendStatus === "request_sent" ? "Pending" :
    friendStatus === "request_received" ? "Accept" :
    "Add Friend";

  const FriendIcon = friendStatus === "friends" ? Users : UserPlus;

  const avatarUrl = realUser.profileImage ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${realUser.username}&backgroundColor=b6e3f4`;
  const coverUrl = realUser.coverImage || coverForUser(realUser.username);
  const displayName = realUser.displayName || realUser.username;

  const handleShare = () => {
    navigator.clipboard?.writeText(`https://reelsy-com.vercel.app/user/${realUser.username}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setMenuOpen(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] bg-background"
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 330, damping: 34 }}
          className="absolute inset-0 flex flex-col overflow-hidden bg-background text-foreground"
        >
          {/* Cover */}
          <div className="relative h-[220px] shrink-0 overflow-visible bg-background">
            <div
              className="absolute inset-0 overflow-hidden bg-secondary"
              style={{
                backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.04), hsl(var(--background) / 0.18) 48%, hsl(var(--background) / 0.82)), url(${coverUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            {/* Top bar */}
            <div className="absolute left-4 right-4 top-5 flex items-center justify-between">
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-background/40 bg-background/75 text-foreground shadow-sm backdrop-blur-md"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-background/40 bg-background/70 text-foreground shadow-sm backdrop-blur-md"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <>
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: -6 }}
                        className="absolute right-0 top-12 z-20 w-52 overflow-hidden rounded-2xl border border-secondary bg-background shadow-2xl"
                      >
                        <button onClick={handleShare}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-semibold">
                          <Share2 className="h-4 w-4 text-muted-foreground" />
                          {copied ? "Copied!" : "Share profile"}
                        </button>
                        <button onClick={() => setMenuOpen(false)}
                          className="flex w-full items-center gap-3 border-t border-secondary/60 px-4 py-3 text-left text-[13px] font-semibold">
                          <Flag className="h-4 w-4 text-muted-foreground" />
                          Report profile
                        </button>
                        {!isMe && (
                          <button onClick={() => setMenuOpen(false)}
                            className="flex w-full items-center gap-3 border-t border-secondary/60 px-4 py-3 text-left text-[13px] font-semibold text-rose-500">
                            <UserX className="h-4 w-4" />
                            Block user
                          </button>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Avatar */}
            <div className="absolute bottom-0 left-5 z-10 translate-y-1/2">
              <div className="h-[82px] w-[82px] overflow-hidden rounded-[26px] border-[4px] border-background bg-secondary shadow-xl">
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              </div>
            </div>

            {/* Action buttons */}
            {!isMe && (
              <div className="absolute bottom-0 right-5 z-10 flex translate-y-1/2 items-center gap-2">
                {onMessage && (
                  <button
                    onClick={() => {
                      if (isStartingDm) return;
                      // Use context directly so ChatTab reacts instantly — no localStorage delay
                      setPendingDmUser({
                        username: realUser.username || "",
                        displayName: realUser.displayName || realUser.username || "",
                        avatar: realUser.profileImage || undefined,
                      });
                      onMessage(realUser);
                      onClose();
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground shadow-sm"
                  >
                    {isStartingDm ? <span className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" /> : <Mail className="h-4 w-4" />}
                  </button>
                )}
                <button
                  onClick={handleFriendAction}
                  disabled={isLoading}
                  className={`flex h-10 items-center gap-1.5 rounded-full px-5 text-[12px] font-bold shadow-sm disabled:opacity-60 ${
                    friendStatus === "friends" || friendStatus === "request_sent"
                      ? "bg-secondary text-foreground"
                      : friendStatus === "request_received"
                      ? "bg-green-500 text-white"
                      : "bg-foreground text-background"
                  }`}
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FriendIcon className="h-3.5 w-3.5" />}
                  {friendLabel}
                </button>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-none bg-background">
            <div className="px-5 pb-8 pt-14">
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-[20px] font-bold tracking-tight">{displayName}</h2>
                </div>
                <p className="text-[12px] font-medium text-muted-foreground">@{realUser.username}</p>
              </div>

              <div className="mt-3 flex items-center gap-5 text-[13px]">
                <p>
                  <span className="font-bold">{stats?.friendCount ?? "—"}</span>{" "}
                  <span className="text-muted-foreground">Friends</span>
                </p>
                <p>
                  <span className="font-bold">{(stats?.postCount ?? realPosts.length) || "—"}</span>{" "}
                  <span className="text-muted-foreground">Posts</span>
                </p>
              </div>

              {realUser.bio && (
                <p className="mt-3 max-w-[310px] text-[13px] leading-relaxed">{realUser.bio}</p>
              )}

              {/* Tabs */}
              <div className="mt-5 flex border-b border-secondary/80">
                {(["posts", "friends"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 pb-3 text-[13px] font-bold capitalize transition-colors ${
                      activeTab === tab ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {tab === "posts" ? "Posts" : "Friends"}
                  </button>
                ))}
              </div>

              {/* Posts Tab */}
              {activeTab === "posts" && (
                <div className="py-2">
                  {postsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : realPosts.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-muted-foreground gap-2">
                      <MessageCircle className="w-8 h-8 opacity-30" />
                      <p className="text-[13px]">No posts yet</p>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {realPosts.map((post: any) => (
                        <div key={String(post._id)} className="border-b border-secondary/60 py-3.5">
                          <div className="flex gap-3">
                            <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full bg-secondary object-cover shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <p className="text-[13px] font-bold truncate">{displayName}</p>
                                <span className="text-[11px] text-muted-foreground shrink-0">
                                  {post.createdAt ? new Date(post.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                                </span>
                              </div>
                              <p className="text-[13px] leading-relaxed text-foreground/90 break-words">
                                {post.content}
                              </p>
                              {/* Media preview */}
                              {post.media && (
                                <div className="mt-2 rounded-2xl overflow-hidden max-h-64 bg-secondary">
                                  {(post.type === "video" || (Array.isArray(post.media) ? post.media[0] : post.media)?.match(/\.(mp4|mov|webm)/i)) ? (
                                    <video
                                      src={Array.isArray(post.media) ? post.media[0] : post.media}
                                      className="w-full max-h-64 object-cover"
                                      controls
                                    />
                                  ) : (
                                    <img
                                      src={Array.isArray(post.media) ? post.media[0] : post.media}
                                      alt=""
                                      className="w-full max-h-64 object-cover"
                                    />
                                  )}
                                </div>
                              )}
                              <div className="mt-2 flex items-center gap-5 text-muted-foreground">
                                <span className="flex items-center gap-1 text-[11px]">
                                  <Heart className="h-3.5 w-3.5" />
                                  {Array.isArray(post.likes) ? post.likes.length : post.likesCount || 0}
                                </span>
                                <span className="flex items-center gap-1 text-[11px]">
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  {post.replyCount || 0}
                                </span>
                                <span className="flex items-center gap-1 text-[11px]">
                                  <Repeat2 className="h-3.5 w-3.5" />
                                  {Array.isArray(post.reposts) ? post.reposts.length : post.repostsCount || 0}
                                </span>
                                <span className="flex items-center gap-1 text-[11px]">
                                  <Bookmark className="h-3.5 w-3.5" /> Save
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Friends Tab */}
              {activeTab === "friends" && (
                <div className="py-2">
                  {friendsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : friends.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-muted-foreground gap-2">
                      <Users className="w-8 h-8 opacity-30" />
                      <p className="text-[13px]">No friends yet</p>
                    </div>
                  ) : (
                    <div className="space-y-1 pt-1">
                      {friends.map((friend) => {
                        const fAvatar = friend.profileImage ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}&backgroundColor=b6e3f4`;
                        return (
                          <div key={friend.username} className="flex items-center gap-3 py-2.5 px-1">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary shrink-0">
                              <img src={fAvatar} alt={friend.username} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[13px] truncate">{friend.displayName || friend.username}</p>
                              <p className="text-[11px] text-muted-foreground truncate">@{friend.username}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Bot Profile (original)
// ─────────────────────────────────────────────────────────────────────────────
const BotProfileView = ({
  bot,
  onClose,
  onChat,
}: {
  bot: Bot;
  onClose: () => void;
  onChat: (bot: Bot) => void;
}) => {
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setFriendStatus(readFriendBotIds().includes(bot.id) ? "friends" : "none");
  }, [bot?.id]);

  const avatarUrl = getBotAvatarUrl(bot);
  const coverUrl = coverForBot(bot.id);

  const handleFriendAction = () => {
    if (friendStatus === "none" && isAutonomousBotId(bot.id)) {
      acceptBotFriendRequest(bot.id);
      setFriendStatus("friends");
    } else if (friendStatus === "none") {
      setFriendStatus("requested");
    } else if (friendStatus === "requested") {
      setFriendStatus("none");
    }
  };

  const friendLabel = friendStatus === "friends" ? "Friends" : friendStatus === "requested" ? "Pending" : "Add Friend";
  const FriendIcon = friendStatus === "friends" ? Users : UserPlus;

  const GRID_IMAGES = [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&auto=format&fit=crop",
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] bg-background"
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 330, damping: 34 }}
          className="absolute inset-0 flex flex-col overflow-hidden bg-background text-foreground"
        >
          <div className="relative h-[220px] shrink-0 overflow-visible bg-background">
            <div
              className="absolute inset-0 overflow-hidden bg-secondary"
              style={{
                backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.04), hsl(var(--background) / 0.18) 48%, hsl(var(--background) / 0.82)), url(${coverUrl}), linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--muted)))`,
                backgroundSize: "cover, cover, cover",
                backgroundPosition: "center",
              }}
            />
            <div className="absolute left-4 right-4 top-5 flex items-center justify-between">
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-background/40 bg-background/75 text-foreground shadow-sm backdrop-blur-md"
                aria-label="Back"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="relative">
              <button
                onClick={() => setMenuOpen((value) => !value)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-background/40 bg-background/70 text-foreground shadow-sm backdrop-blur-md"
                aria-label="More"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.94, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, y: -6 }}
                      className="absolute right-0 top-12 z-20 w-52 overflow-hidden rounded-2xl border border-secondary bg-background shadow-2xl"
                    >
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(`https://reelsy-com.vercel.app/user/${bot.id}`).catch(() => {});
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-semibold"
                      >
                        <Share2 className="h-4 w-4 text-muted-foreground" />
                        Share profile
                      </button>
                      <button
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-3 border-t border-secondary/60 px-4 py-3 text-left text-[13px] font-semibold"
                      >
                        <Flag className="h-4 w-4 text-muted-foreground" />
                        Report profile
                      </button>
                      <button
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-3 border-t border-secondary/60 px-4 py-3 text-left text-[13px] font-semibold text-rose-500"
                      >
                        <UserX className="h-4 w-4" />
                        Block user
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
              </div>
            </div>
            <div className="absolute bottom-0 left-5 z-10 translate-y-1/2">
              <div className="h-[82px] w-[82px] overflow-hidden rounded-[26px] border-[4px] border-background bg-secondary shadow-xl">
                <img src={avatarUrl} alt={bot.name} className="h-full w-full object-cover" />
              </div>
            </div>
            <div className="absolute bottom-0 right-5 z-10 flex translate-y-1/2 items-center gap-2">
              <button
                onClick={() => onChat(bot)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground shadow-sm"
                aria-label={`Message ${bot.name}`}
              >
                <Mail className="h-4 w-4" />
              </button>
              <button
                onClick={handleFriendAction}
                className={`flex h-10 items-center gap-1.5 rounded-full px-5 text-[12px] font-bold shadow-sm ${
                  friendStatus === "friends" || friendStatus === "requested"
                    ? "bg-secondary text-foreground"
                    : "bg-foreground text-background"
                }`}
              >
                <FriendIcon className="h-3.5 w-3.5" />
                {friendLabel}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-none bg-background">
            <div className="px-5 pb-8 pt-14">
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-[20px] font-bold tracking-tight">{bot.name}</h2>
                  {bot.verified && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="text-[12px] font-medium text-muted-foreground">{bot.handle}</p>
              </div>

              <div className="mt-3 flex items-center gap-4 text-[13px]">
                <p><span className="font-bold">{bot.following}</span> <span className="text-muted-foreground">Friends</span></p>
                <p><span className="font-bold">{bot.followers}</span> <span className="text-muted-foreground">Posts</span></p>
              </div>

              <p className="mt-3 max-w-[310px] text-[13px] leading-relaxed">{bot.bio}</p>

              <div className="mt-5 flex border-b border-secondary/80">
                {(["posts", "friends"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 pb-3 text-[13px] font-bold capitalize transition-colors ${
                      activeTab === tab ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {tab === "posts" ? "Posts" : "Friends"}
                  </button>
                ))}
              </div>

              {activeTab === "posts" ? (
                <div className="border-b border-secondary/70 py-4">
                  <div className="flex gap-3">
                    <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full bg-secondary object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[13px] font-bold">{bot.name}</p>
                          <p className="text-[11px] text-muted-foreground">{bot.handle} - {bot.role}</p>
                        </div>
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="mt-2 text-[12px] leading-relaxed text-foreground/85">
                        {profilePostText(bot.name, bot.role)}
                      </p>
                      <div className="mt-3 flex items-center gap-5 text-muted-foreground">
                        <span className="flex items-center gap-1 text-[11px]"><MessageCircle className="h-3.5 w-3.5" /> 24</span>
                        <span className="flex items-center gap-1 text-[11px]"><Heart className="h-3.5 w-3.5" /> 1.2K</span>
                        <span className="flex items-center gap-1 text-[11px]"><Bookmark className="h-3.5 w-3.5" /> Save</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 py-4">
                  {GRID_IMAGES.map((img, index) => (
                    <div key={img} className="relative aspect-square overflow-hidden rounded-sm bg-secondary">
                      <img src={img} alt="" className="h-full w-full object-cover" />
                      {index === 2 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <Play className="h-6 w-6 fill-white text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main export — routes to Bot or Real User view
// ─────────────────────────────────────────────────────────────────────────────
const UserProfile = ({ bot, realUser, onClose, onChat, onMessage }: UserProfileProps) => {
  if (realUser) {
    return <RealUserProfileView realUser={realUser} onClose={onClose} onMessage={onMessage} />;
  }
  if (bot && onChat) {
    return <BotProfileView bot={bot} onClose={onClose} onChat={onChat} />;
  }
  return null;
};

export default UserProfile;
