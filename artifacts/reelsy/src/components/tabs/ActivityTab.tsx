import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon, Video, Bookmark, Clock, Edit2, Trash2, Camera, Film, Play,
  Heart, MessageCircle, ArrowRight, UserPlus, UserCheck, Users, Bell, Check, X, Loader2
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import PostComposer from "../PostComposer";
import { useNotifications } from "@/context/NotificationContext";
import { useFriends } from "@/hooks/useFriends";
import { api, AppNotification } from "@/lib/api";
import { LottieEmoji } from "@/components/LottieEmoji";
import { EmojiText } from "@/components/EmojiText";

interface PostData {
  id: string; botId?: string; type: "text" | "image" | "video"; content: string;
  media?: string | string[]; likes: number; replies: number; reposts: number;
  views: number; time: string; isUserPost?: boolean; userAvatar?: string;
  music?: { title: string; artist: string; url: string };
  reshare?: { authorName: string; authorHandle: string; content: string; media?: string | string[] };
}
interface DraftData {
  id: string; content: string; mediaUrls: string[];
  mediaType: "image" | "video" | null; music?: { title: string; artist: string; url: string }; createdAt: number;
}

const NOTIF_ICON: Record<AppNotification["type"], React.ReactNode> = {
  like: <LottieEmoji emoji="❤️" size={16} />,
  comment: <LottieEmoji emoji="💬" size={16} />,
  reshare: <LottieEmoji emoji="🔁" size={16} />,
  save: <LottieEmoji emoji="🔖" size={16} />,
  friend_request: <UserPlus className="w-3.5 h-3.5 text-blue-500" />,
  friend_accepted: <UserCheck className="w-3.5 h-3.5 text-violet-500" />,
};

const NOTIF_TEXT: Record<AppNotification["type"], string> = {
  like: "liked your post",
  comment: "commented on your post",
  reshare: "reshared your post",
  save: "saved your post",
  friend_request: "sent you a friend request",
  friend_accepted: "accepted your friend request",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const NotificationsPanel = () => {
  const { notifications, fetchNotifications, markRead, markAllRead, unreadCount } = useNotifications();
  const { friends: { acceptRequest, declineRequest } } = useFriendsHelper();
  const [acting, setActing] = useState<Record<string, boolean>>({});

  useEffect(() => { fetchNotifications(); }, []);

  const handleAccept = async (notif: AppNotification) => {
    if (!notif.requestId) return;
    setActing((p) => ({ ...p, [notif._id]: true }));
    await acceptRequest(notif.requestId, notif.fromUsername);
    await markRead(notif._id);
    await fetchNotifications();
    setActing((p) => ({ ...p, [notif._id]: false }));
  };

  const handleDecline = async (notif: AppNotification) => {
    if (!notif.requestId) return;
    setActing((p) => ({ ...p, [notif._id]: true }));
    await declineRequest(notif.requestId, notif.fromUsername);
    await markRead(notif._id);
    await fetchNotifications();
    setActing((p) => ({ ...p, [notif._id]: false }));
  };

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <Bell className="w-12 h-12 mb-3 stroke-[1.2] opacity-60" />
        <p className="text-[13px] font-semibold">No Notifications Yet</p>
        <p className="text-[11px] max-w-[200px] mt-1">When people like, comment, or send you friend requests, you'll see them here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {unreadCount > 0 && (
        <div className="flex justify-end mb-2">
          <button onClick={markAllRead} className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Mark all read
          </button>
        </div>
      )}
      {notifications.map((notif) => (
        <motion.div
          key={notif._id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => !notif.read && markRead(notif._id)}
          className={`flex items-start gap-3 p-3 rounded-2xl transition-colors cursor-pointer ${
            !notif.read ? "bg-blue-500/8 border border-blue-500/15" : "bg-secondary/30 hover:bg-secondary/50"
          }`}
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center text-[14px] font-bold"
              style={{
                backgroundImage: notif.fromProfileImage ? `url(${notif.fromProfileImage})` : undefined,
                backgroundSize: "cover", backgroundPosition: "center",
              }}
            >
              {!notif.fromProfileImage && (notif.fromDisplayName?.[0] || "?")}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-background flex items-center justify-center border border-secondary/60">
              {NOTIF_ICON[notif.type]}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold">
              <span>{notif.fromDisplayName || notif.fromUsername}</span>{" "}
              <span className="font-normal text-muted-foreground">{NOTIF_TEXT[notif.type]}</span>
            </p>
            {notif.commentText && (
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                <EmojiText text={notif.commentText} emojiSize={14} />
              </p>
            )}
            {notif.postPreview && !notif.commentText && (
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{notif.postPreview}</p>
            )}
            <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(notif.createdAt)}</p>

            {/* Friend request actions */}
            {notif.type === "friend_request" && notif.requestId && !notif.read && (
              <div className="flex gap-2 mt-2">
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={(e) => { e.stopPropagation(); handleAccept(notif); }}
                  disabled={acting[notif._id]}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-foreground text-background text-[11px] font-semibold disabled:opacity-60"
                >
                  {acting[notif._id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Accept
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={(e) => { e.stopPropagation(); handleDecline(notif); }}
                  disabled={acting[notif._id]}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary text-foreground text-[11px] font-semibold disabled:opacity-60"
                >
                  <X className="w-3 h-3" /> Decline
                </motion.button>
              </div>
            )}
            {notif.type === "friend_accepted" && (
              <p className="text-[10px] text-violet-500 font-semibold mt-1">You're now friends 🎉</p>
            )}
          </div>

          {!notif.read && (
            <div className="shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
          )}
        </motion.div>
      ))}
    </div>
  );
};

// Helper hook to access friends methods from useFriends
function useFriendsHelper() {
  const { user } = useAppContext();
  const myUserId = user?.supabaseId || user?.username || "";
  const myUsername = user?.username || "";

  const acceptRequest = useCallback(async (requestId: string, _fromUsername: string) => {
    if (!myUserId) return;
    await api.friends.accept(requestId, myUserId);
  }, [myUserId]);

  const declineRequest = useCallback(async (requestId: string, _fromUsername: string) => {
    if (!myUserId) return;
    await api.friends.decline(requestId, myUserId);
  }, [myUserId]);

  return { friends: { acceptRequest, declineRequest } };
}

const ActivityTab = () => {
  const { user } = useAppContext();
  const [activeSubTab, setActiveSubTab] = useState<"notifications" | "pic" | "video" | "save" | "memory" | "draft">("notifications");
  const [savedPosts, setSavedPosts] = useState<PostData[]>([]);
  const [userPosts, setUserPosts] = useState<PostData[]>([]);
  const [drafts, setDrafts] = useState<DraftData[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<DraftData | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const { unreadCount } = useNotifications();

  useEffect(() => {
    const loadData = () => {
      const saved = localStorage.getItem("reelsy_saved_posts");
      if (saved) setSavedPosts(JSON.parse(saved));
      const created = localStorage.getItem("reelsy_user_posts");
      if (created) setUserPosts(JSON.parse(created));
      const savedDrafts = localStorage.getItem("reelsy_drafts");
      if (savedDrafts) setDrafts(JSON.parse(savedDrafts));
    };
    loadData();
    window.addEventListener("storage", loadData);
    const interval = setInterval(loadData, 1000);
    return () => { window.removeEventListener("storage", loadData); clearInterval(interval); };
  }, []);

  const deleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = drafts.filter((d) => d.id !== id);
    setDrafts(updated);
    localStorage.setItem("reelsy_drafts", JSON.stringify(updated));
  };

  const handleEditDraft = (draft: DraftData) => { setSelectedDraft(draft); setComposerOpen(true); };

  const handlePostFromDraft = (postData: { type: "text" | "image" | "video"; content: string; media?: string | string[]; music?: { title: string; artist: string; url: string } }) => {
    const newPost: PostData = {
      id: `user-${Date.now()}`, type: postData.type, content: postData.content, media: postData.media,
      likes: 0, replies: 0, reposts: 0, views: 1, time: "just now", isUserPost: true, userAvatar: user?.avatar, music: postData.music,
    };
    const updatedPosts = [newPost, ...userPosts];
    setUserPosts(updatedPosts);
    localStorage.setItem("reelsy_user_posts", JSON.stringify(updatedPosts));
    if (selectedDraft) {
      const updatedDrafts = drafts.filter((d) => d.id !== selectedDraft.id);
      setDrafts(updatedDrafts);
      localStorage.setItem("reelsy_drafts", JSON.stringify(updatedDrafts));
    }
    setComposerOpen(false); setSelectedDraft(null);
  };

  const unsplashMemories = [
    { id: "mem-1", title: "1 Year Ago today...", content: "Chasing sunsets on the Lagos coast. Unforgettable vibes! 🌅", img: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&auto=format&fit=crop", date: "May 20, 2025" },
    { id: "mem-2", title: "6 Months Ago today...", content: "Late night coding sessions and aesthetic coffee runs. ☕💻", img: "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=400&auto=format&fit=crop", date: "Nov 20, 2025" },
    { id: "mem-3", title: "3 Months Ago today...", content: "Exploring the hidden gems of the city. Modern architecture is art. 🏢✨", img: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&auto=format&fit=crop", date: "Feb 20, 2026" },
  ];

  const userImages = userPosts.filter(p => p.type === "image");
  const savedImages = savedPosts.filter(p => p.type === "image");
  const allImages = [...userImages, ...savedImages];
  const userVideos = userPosts.filter(p => p.type === "video");
  const savedVideos = savedPosts.filter(p => p.type === "video");
  const allVideos = [...userVideos, ...savedVideos];

  const SUB_TABS = [
    { id: "notifications", label: "Notifs", icon: Bell, badge: unreadCount },
    { id: "pic", label: "Pic", icon: ImageIcon },
    { id: "video", label: "Video", icon: Video },
    { id: "save", label: "Save", icon: Bookmark },
    { id: "memory", label: "Memory", icon: Clock },
    { id: "draft", label: "Draft", icon: Edit2 },
  ] as const;

  return (
    <div className="absolute inset-0 flex flex-col bg-background">
      <div className="shrink-0 px-4 pt-4 pb-2 border-b border-secondary/50">
        <h1 className="text-[20px] font-bold text-foreground">Activity</h1>
        <p className="text-[12px] text-muted-foreground">Notifications, memories, saves, and drafts</p>
      </div>

      <div className="shrink-0 flex gap-1 px-4 py-2 bg-secondary/20 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all relative shrink-0 ${
                isActive ? "text-foreground bg-secondary/60" : "text-muted-foreground hover:text-foreground/80"
              }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {(tab as any).badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {(tab as any).badge > 9 ? "9+" : (tab as any).badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none p-4 pb-24">
        <AnimatePresence mode="wait">
          {activeSubTab === "notifications" && (
            <motion.div key="notifs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <NotificationsPanel />
            </motion.div>
          )}

          {activeSubTab === "pic" && (
            <motion.div key="pic" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {allImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                  <Camera className="w-12 h-12 mb-3 stroke-[1.2] opacity-60" />
                  <p className="text-[13px] font-semibold">No Image Activity</p>
                  <p className="text-[11px] max-w-[200px] mt-1">Images you post or save will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {allImages.map((post) => (
                    <div key={post.id} className="relative rounded-2xl overflow-hidden aspect-square bg-secondary shadow-sm border border-secondary/50 group">
                      <img src={Array.isArray(post.media) ? post.media[0] : post.media} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        <p className="text-[11px] text-white/90 line-clamp-2 leading-snug">{post.content}</p>
                        <span className="text-[9px] text-white/60 mt-1.5">{post.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeSubTab === "video" && (
            <motion.div key="video" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {allVideos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                  <Film className="w-12 h-12 mb-3 stroke-[1.2] opacity-60" />
                  <p className="text-[13px] font-semibold">No Video Activity</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {allVideos.map((post) => (
                    <div key={post.id} className="relative rounded-2xl overflow-hidden aspect-square bg-secondary shadow-sm border border-secondary/50 group">
                      <video src={Array.isArray(post.media) ? post.media[0] : post.media} className="w-full h-full object-cover" muted loop playsInline />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/45 transition-colors">
                        <Play className="w-8 h-8 text-white drop-shadow-md" fill="white" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeSubTab === "save" && (
            <motion.div key="save" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              {savedPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                  <Bookmark className="w-12 h-12 mb-3 stroke-[1.2] opacity-60" />
                  <p className="text-[13px] font-semibold">No Bookmarks Saved</p>
                </div>
              ) : (
                savedPosts.map((post) => (
                  <div key={post.id} className="flex gap-3 p-3 rounded-2xl bg-secondary/40 border border-secondary/50">
                    {post.media ? (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary shrink-0">
                        {post.type === "video"
                          ? <video src={Array.isArray(post.media) ? post.media[0] : post.media} className="w-full h-full object-cover" muted />
                          : <img src={Array.isArray(post.media) ? post.media[0] : post.media} className="w-full h-full object-cover" alt="" />}
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-secondary/80 flex items-center justify-center shrink-0"><Bookmark className="w-6 h-6 text-muted-foreground" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium truncate">{post.content}</p>
                      <div className="flex items-center gap-3 text-muted-foreground mt-2">
                        <span className="flex items-center gap-1 text-[10px]"><Heart className="w-3.5 h-3.5" /> {post.likes}</span>
                        <span className="flex items-center gap-1 text-[10px]"><MessageCircle className="w-3.5 h-3.5" /> {post.replies}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeSubTab === "memory" && (
            <motion.div key="memory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-2xl">
                <p className="text-[12px] text-violet-500 font-bold mb-1"><LottieEmoji emoji="🎉" size={14} className="inline" /> Time Capsule</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">Look back at your favorite memories on Reelsy.</p>
              </div>
              {unsplashMemories.map((mem) => (
                <div key={mem.id} className="rounded-3xl overflow-hidden border border-secondary bg-secondary/20 shadow-sm relative aspect-[4/3] group">
                  <img src={mem.img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-4">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-violet-400 mb-0.5">{mem.title}</span>
                    <p className="text-[13px] font-bold text-white leading-snug">{mem.content}</p>
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/10">
                      <span className="text-[10px] text-white/60">{mem.date}</span>
                      <button className="flex items-center gap-1 text-[10px] font-bold text-violet-400"><ArrowRight className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeSubTab === "draft" && (
            <motion.div key="draft" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              {drafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                  <Edit2 className="w-12 h-12 mb-3 stroke-[1.2] opacity-60" />
                  <p className="text-[13px] font-semibold">No Drafts Saved</p>
                </div>
              ) : (
                drafts.map((draft) => (
                  <div key={draft.id} onClick={() => handleEditDraft(draft)}
                    className="p-3.5 rounded-2xl bg-secondary/40 border border-secondary/50 flex items-start gap-3 cursor-pointer group">
                    {draft.mediaUrls.length > 0 ? (
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-secondary shrink-0">
                        {draft.mediaType === "video"
                          ? <video src={draft.mediaUrls[0]} className="w-full h-full object-cover" muted />
                          : <img src={draft.mediaUrls[0]} className="w-full h-full object-cover" alt="" />}
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-secondary/80 flex items-center justify-center shrink-0"><Edit2 className="w-5 h-5 text-muted-foreground" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold line-clamp-2">{draft.content || <span className="italic text-muted-foreground/60">Empty draft</span>}</p>
                      <span className="text-[9px] text-muted-foreground/60 block mt-2">Saved {new Date(draft.createdAt).toLocaleDateString()}</span>
                    </div>
                    <button onClick={(e) => deleteDraft(draft.id, e)} className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {composerOpen && selectedDraft && (
          <PostComposer
            onClose={() => { setComposerOpen(false); setSelectedDraft(null); }}
            onPost={handlePostFromDraft}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActivityTab;
