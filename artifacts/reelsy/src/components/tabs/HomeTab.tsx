import { useState, useRef, useEffect, useMemo } from "react";

import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Heart, MessageCircle, Repeat2, Bookmark, Plus,
  MoreHorizontal, TrendingUp, Eye, X, Send, Share2, Hash, AtSign, Check, SmileIcon,
  Flag, UserMinus, UserCheck, Link, EyeOff, ChevronLeft, ChevronRight, Video, Play, Pause, Music,
  BarChart3, ExternalLink, Globe2, MapPin, VolumeX, ShieldOff, Loader2
} from "lucide-react";
import reelsyLogo from "@assets/db1645cc1ed95625a5dff41ee9a0f164_1778235733181.jpg";
import UserProfile from "@/components/UserProfile";
import PostComposer from "@/components/PostComposer";
import { useAppContext } from "@/context/AppContext";
import { useFeatureIntro } from "@/context/FeatureIntroContext";
import MediaViewer from "@/components/ui/MediaViewer";
import { useEngagement } from "@/hooks/useEngagement";
import { LottieEmoji } from "@/components/LottieEmoji";
import { EmojiText } from "@/components/EmojiText";
import { api } from "@/lib/api";

interface HomeTabProps { onNavVisible?: (v: boolean) => void; }

// Stories are loaded dynamically from the API — see HomeTab state
type StoryItem = { id: string; name: string; avatarUrl: string; unread: boolean; authorUsername: string };
const TAGS = ["#design", "#afrobeats", "#fyp", "#Lagos", "#AI", "#minimalism", "#creativity", "#startup", "#music", "#fashion", "#film", "#wellness", "#tech", "#culture", "#broadcast", "#reelsy", "#photography", "#travel", "#nature", "#fitness", "#food", "#art", "#lifestyle", "#coding", "#vlog", "#entertainment", "#business", "#growth", "#vibes", "#news"];

const formatCount = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);


interface PostData {
  id: string;
  botId?: string;
  type: "text" | "image" | "video";
  content: string;
  media?: string | string[];
  likes: number;
  replies: number;
  reposts: number;
  views: number;
  time: string;
  isUserPost?: boolean;
  userAvatar?: string;
  // Real author fields from MongoDB
  authorName?: string;
  authorHandle?: string;
  authorUsername?: string;
  authorAvatar?: string;
  music?: { title: string; artist: string; url: string };
  location?: { lat: number; lng: number; name: string };
  aiGenerated?: boolean;
  reshare?: { authorName: string; authorHandle: string; content: string; media?: string | string[] };

  // Ad-like post (like-only, no reshare/comment)
  isAd?: boolean;
  adBrandName?: string;
  adHandle?: string;
  adAvatar?: string;
  adText?: string;
  adMedia?: string | string[];
  adDomain?: string;
  adUrl?: string;
  adHeadline?: string;
  adDescription?: string;
  adCta?: string;
  seenTotal?: number;
  worldSeen?: { region: string; value: number }[]; // sums to ~seenTotal
}


const HeartBurst = ({ x, y }: { x: number; y: number }) => (
  <motion.div className="fixed pointer-events-none z-[100]" style={{ left: x - 40, top: y - 40 }}>
    {Array.from({ length: 8 }).map((_, i) => (
      <motion.div key={i}
        initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
        animate={{ scale: [0, 1.3, 0], x: Math.cos((i / 8) * Math.PI * 2) * 36, y: Math.sin((i / 8) * Math.PI * 2) * 36, opacity: [1, 1, 0] }}
        transition={{ duration: 0.52, ease: "easeOut" }}
        className="absolute top-10 left-10 text-rose-500 text-[13px]">♥</motion.div>
    ))}
    <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: [0, 2.4, 0], opacity: [1, 1, 0] }}
      transition={{ duration: 0.48 }} className="absolute top-6 left-6 text-rose-500 text-[26px]">♥</motion.div>
  </motion.div>
);

// ---- Render post content with # and @ highlighting ----
const RichContent = ({ text, onTagClick }: { text: string; onTagClick?: (tag: string) => void }) => {
  const parts = text.split(/([@#]\w+)/g);
  return (
    <p className="text-[13px] leading-[1.6] mb-2.5 whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith("#")) {
          return <span key={i} onClick={(e) => { e.stopPropagation(); onTagClick?.(part); }} className="text-blue-500 font-semibold cursor-pointer hover:underline">{part}</span>;
        }
        if (part.startsWith("@")) {
          return <span key={i} className="text-violet-500 font-semibold cursor-pointer hover:underline">{part}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
};

interface CommentData {
  id: string;
  name: string;
  handle: string;
  text: string;
  time: string;
  avatarSeed?: string;
  avatar?: string;
  likes: number;
  liked?: boolean;
  replies?: CommentData[];
  replyTo?: string;
}

const CommentSheet = ({ post, onClose }: { post: PostData; onClose: () => void }) => {
  const { user } = useAppContext();
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<CommentData | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Fetch real comments from backend on mount
  useEffect(() => {
    if (!post.id || post.id.startsWith("ad-")) return;
    setLoadingComments(true);
    api.posts.getComments(post.id).then(({ comments: apiComments }) => {
      // Build flat list first
      const flat: CommentData[] = apiComments.map((c: any) => ({
        id: c._id,
        name: c.authorDisplayName || c.authorUsername || "User",
        handle: `@${c.authorUsername || "user"}`,
        text: c.content || "",
        time: c.createdAt ? new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "recently",
        avatar: c.authorAvatar || undefined,
        likes: Array.isArray(c.likes) ? c.likes.length : 0,
        liked: Array.isArray(c.likes) && user?.username ? c.likes.includes(user.username) : false,
        replies: [] as CommentData[],
        replyTo: c.replyTo,
      }));
      // Reconstruct reply threads: attach replies to their parent
      const byId = new Map(flat.map((c) => [c.id, c]));
      const roots: CommentData[] = [];
      for (const c of flat) {
        if (c.replyTo && byId.has(c.replyTo)) {
          const parent = byId.get(c.replyTo)!;
          if (!parent.replies) parent.replies = [];
          parent.replies.push(c);
        } else {
          roots.push(c);
        }
      }
      setComments(roots);
    }).catch(() => {}).finally(() => setLoadingComments(false));
  }, [post.id]);

  const handleLikeComment = (commentId: string) => {
    setComments((prevComments) => {
      const updateList = (list: CommentData[]): CommentData[] => {
        return list.map((c) => {
          if (c.id === commentId) {
            return { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: updateList(c.replies) };
          }
          return c;
        });
      };
      return updateList(prevComments);
    });
  };

  const sendComment = async (textToSend?: string) => {
    const text = (textToSend || commentText).trim();
    if (!text) return;

    const newComment: CommentData = {
      id: `comment-${Date.now()}`,
      name: user?.nickname || "You",
      handle: user?.username ? `@${user.username}` : "@you",
      text,
      time: "now",
      avatar: user?.avatar || undefined,
      likes: 0,
      liked: false,
      replies: [],
      replyTo: replyingTo?.id,
    };

    // Persist to backend (non-blocking)
    if (user?.username && !post.id.startsWith("ad-")) {
      api.posts.addComment(post.id, {
        authorUsername: user.username,
        authorDisplayName: user.nickname || user.username,
        authorAvatar: user.avatar || undefined,
        content: text,
        replyTo: replyingTo?.id,
      }).catch(() => {});
    }

    if (replyingTo) {
      setComments((prevComments) =>
        prevComments.map((c) =>
          c.id === replyingTo.id
            ? { ...c, replies: [...(c.replies || []), newComment] }
            : c
        )
      );
      setReplyingTo(null);
    } else {
      setComments((prev) => [...prev, newComment]);
    }

    if (!textToSend) setCommentText("");
    setShowEmojiPicker(false);
  };

  const handleEmojiClick = (emoji: string) => {
    sendComment(emoji);
  };

  const userAvatarUrl = user?.avatar
    ? user.avatar
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || "user"}&backgroundColor=b6e3f4`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 -z-10" />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="bg-background rounded-t-[28px] flex flex-col relative overflow-hidden" style={{ maxHeight: "78%" }}
        onClick={(e) => e.stopPropagation()}>
        
        <div className="shrink-0 flex items-center justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-secondary" />
        </div>

        <div className="shrink-0 flex items-center justify-between px-5 pt-2 pb-2 border-b border-secondary/40">
          <p className="font-bold text-[15px]">Comments</p>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
             <X className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-none px-4 py-2 space-y-1">
          {loadingComments && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" />
            </div>
          )}
          {!loadingComments && comments.length === 0 && (
            <p className="text-center text-[12px] text-muted-foreground py-8">No comments yet. Be the first!</p>
          )}
          {!loadingComments && comments.map((c) => (
            <div key={c.id} className="py-2.5">
              <div className="flex gap-3">
                {c.avatar ? (
                  c.avatar.startsWith("<") ? (
                    <div dangerouslySetInnerHTML={{ __html: c.avatar }} className="w-8 h-8 rounded-full bg-secondary shrink-0 overflow-hidden" />
                  ) : (
                    <img src={c.avatar} className="w-8 h-8 rounded-full bg-secondary shrink-0 object-cover" alt="" />
                  )
                ) : (
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.avatarSeed || "user"}&backgroundColor=b6e3f4`}
                    className="w-8 h-8 rounded-full bg-secondary shrink-0 object-cover" alt="" />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span className="font-semibold text-[12px]">{c.name}</span>
                    <span className="text-muted-foreground text-[10px]">{c.handle}</span>
                    <span className="text-muted-foreground text-[10px]">· {c.time}</span>
                  </div>
                  <EmojiText text={c.text} emojiSize={16} className="text-[13px] leading-relaxed text-foreground" />
                  
                  <div className="flex items-center gap-4 mt-2">
                    <button onClick={() => setReplyingTo(c)} className="text-[10px] text-muted-foreground font-semibold hover:text-foreground transition-colors">Reply</button>
                    <button onClick={() => handleLikeComment(c.id)} className={`flex items-center gap-1 transition-colors ${c.liked ? "text-rose-500 font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
                      <Heart className="w-3.5 h-3.5" strokeWidth={1.7} fill={c.liked ? "currentColor" : "none"} />
                      <span className="text-[10px]">{c.likes}</span>
                    </button>
                  </div>
                </div>
              </div>

              {c.replies && c.replies.length > 0 && (
                <div className="ml-11 mt-3 pl-3 border-l-2 border-secondary/50 space-y-3">
                  {c.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-2.5">
                      {reply.avatar ? (
                        reply.avatar.startsWith("<") ? (
                          <div dangerouslySetInnerHTML={{ __html: reply.avatar }} className="w-6 h-6 rounded-full bg-secondary shrink-0 overflow-hidden" />
                        ) : (
                          <img src={reply.avatar} className="w-6 h-6 rounded-full bg-secondary shrink-0 object-cover" alt="" />
                        )
                      ) : (
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.avatarSeed || "user"}&backgroundColor=b6e3f4`}
                          className="w-6 h-6 rounded-full bg-secondary shrink-0 object-cover" alt="" />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5 mb-0.5">
                          <span className="font-semibold text-[11px]">{reply.name}</span>
                          <span className="text-muted-foreground text-[9px]">{reply.handle}</span>
                          <span className="text-muted-foreground text-[9px]">· {reply.time}</span>
                        </div>
                        <EmojiText text={reply.text} emojiSize={14} className="text-[12px] leading-relaxed text-foreground" />
                        
                        <div className="flex items-center gap-4 mt-1.5">
                          <button onClick={() => handleLikeComment(reply.id)} className={`flex items-center gap-1 transition-colors ${reply.liked ? "text-rose-500 font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
                            <Heart className="w-3 h-3" strokeWidth={1.7} fill={reply.liked ? "currentColor" : "none"} />
                            <span className="text-[9px]">{reply.likes}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="shrink-0 px-4 pt-2 pb-6 border-t border-secondary/40 bg-background relative z-10">
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: -48, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                className="absolute left-4 right-4 bg-background/95 backdrop-blur-md rounded-2xl p-2 border border-secondary shadow-2xl flex justify-around items-center"
              >
                {["😂", "😭", "🔥", "🎉", "😎", "😍", "🤑"].map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileTap={{ scale: 1.35 }}
                    onClick={() => handleEmojiClick(emoji)}
                    className="py-1 px-1.5 hover:bg-secondary/40 rounded-xl transition-all flex items-center justify-center"
                  >
                    <LottieEmoji emoji={emoji} size={30} loop={false} />
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {replyingTo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 26, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex items-center justify-between text-[11px] text-muted-foreground pb-2 overflow-hidden"
              >
                <span>Replying to <span className="font-semibold text-foreground">{replyingTo.handle}</span></span>
                <button onClick={() => setReplyingTo(null)} className="p-0.5 hover:bg-secondary rounded-full">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2 items-center">
            <div className="w-8 h-8 rounded-full bg-secondary shrink-0 overflow-hidden">
              {user?.avatar ? (
                user.avatar.startsWith("<")
                  ? <div dangerouslySetInnerHTML={{ __html: user.avatar }} className="w-full h-full" />
                  : <img src={user.avatar} alt="you" className="w-full h-full object-cover" />
              ) : (
                <img src={userAvatarUrl} alt="you" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 flex items-center gap-2 bg-secondary rounded-full px-3.5 py-2">
              <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendComment()}
                placeholder={replyingTo ? "Add a reply..." : "Add a comment..."}
                style={{ fontSize: 13 }}
                className="flex-1 bg-transparent outline-none text-[13px] font-medium placeholder:text-muted-foreground/50" />
              
              {commentText.trim() === "" ? (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <span className="text-lg">  <SmileIcon className="w-4 h-4 text-foreground" /></span>
                </motion.button>
              ) : (
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => sendComment()}>
                  <Send className="w-4 h-4 text-foreground" strokeWidth={1.8} />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const getAdMediaSrc = (post: PostData) => {
  if (!post.adMedia) return undefined;
  return Array.isArray(post.adMedia) ? post.adMedia[0] : post.adMedia;
};

const getSeenTotal = (post: PostData) =>
  post.seenTotal ?? post.worldSeen?.reduce((sum, item) => sum + item.value, 0) ?? post.views;

const AdInsightsSheet = ({
  post,
  onClose,
  onOpenBrowser,
}: {
  post: PostData;
  onClose: () => void;
  onOpenBrowser: (post: PostData) => void;
}) => {
  const stats = post.worldSeen || [];
  const total = getSeenTotal(post);
  const maxSeen = Math.max(...stats.map((item) => item.value), 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[70] flex flex-col justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/45 -z-10" />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="bg-background rounded-t-[28px] px-4 pt-3 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center pb-3">
          <div className="w-9 h-1 rounded-full bg-secondary" />
        </div>

        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" strokeWidth={2} />
              <p className="font-bold text-[15px]">Ad review</p>
            </div>
            <p className="text-[12px] text-muted-foreground mt-1">
              {formatCount(total)} people have seen this around the world.
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        <div className="rounded-2xl border border-secondary/70 overflow-hidden mb-4">
          {stats.map((item, index) => {
            const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <div
                key={item.region}
                className={`px-3.5 py-3 ${index > 0 ? "border-t border-secondary/50" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold">{item.region}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatCount(item.value)} - {percent}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max((item.value / maxSeen) * 100, 6)}%` }}
                    transition={{ duration: 0.55, delay: index * 0.05, ease: "easeOut" }}
                    className="h-full rounded-full bg-blue-500"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onOpenBrowser(post)}
          className="w-full h-11 rounded-full bg-foreground text-background flex items-center justify-center gap-2 text-[13px] font-bold"
        >
          Open sponsor
          <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

const ReelsyAdBrowser = ({
  post,
  onClose,
}: {
  post: PostData;
  onClose: () => void;
}) => {
  const adMedia = getAdMediaSrc(post);
  const brandName = post.adBrandName || "Sponsor";
  const domain = post.adDomain || "sponsor.reelsy";
  const url = post.adUrl || `https://${domain}`;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 34 }}
      className="absolute inset-0 z-[90] bg-background flex flex-col"
    >
      <div className="shrink-0 px-3 pt-3 pb-2 border-b border-secondary/60">
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </motion.button>
          <div className="flex-1 min-w-0 h-9 rounded-full bg-secondary px-3 flex items-center gap-2">
            <img src={reelsyLogo} alt="" className="w-5 h-5 rounded-lg object-cover shrink-0" />
            <span className="text-[12px] font-semibold truncate">{domain}</span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none">
        <div className="relative h-48 bg-secondary overflow-hidden">
          {adMedia && (
            <img src={adMedia} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute left-4 right-4 bottom-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Globe2 className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">Reelsy Browser</span>
            </div>
            <h2 className="text-[24px] font-black leading-tight">{brandName}</h2>
          </div>
        </div>

        <div className="px-4 py-5">
          <p className="text-[11px] font-bold text-blue-500 uppercase tracking-[0.18em] mb-2">
            Sponsored
          </p>
          <h1 className="text-[23px] leading-tight font-black mb-3">
            {post.adHeadline || "Shop smart with Reelsy partners."}
          </h1>
          <p className="text-[13px] leading-relaxed text-muted-foreground mb-4">
            {post.adDescription || "Explore the latest offer from this sponsor without leaving Reelsy."}
          </p>

          <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full h-12 rounded-full bg-foreground text-background flex items-center justify-center gap-2 text-[14px] font-bold mb-5"
          >
            {post.adCta || "Visit store"}
            <ExternalLink className="w-4 h-4" strokeWidth={2} />
          </motion.button>

          <div className="grid grid-cols-2 gap-3">
            {[
              ["Smart devices", "Fast everyday upgrades"],
              ["Creator tools", "Gear for better videos"],
              ["Accessories", "Clean desk essentials"],
              ["Deals", "Limited sponsored offers"],
            ].map(([title, subtitle]) => (
              <div key={title} className="rounded-2xl bg-secondary/60 border border-secondary/70 p-3 min-h-[92px]">
                <p className="text-[12px] font-bold mb-1">{title}</p>
                <p className="text-[11px] leading-snug text-muted-foreground">{subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const REPORT_REASONS_POST = ["Spam", "Misinformation", "Hateful content", "Nudity or sexual content", "Violence", "Scam or fraud", "Other"];

const PostCard = ({
  post, authorName, authorAvatar, currentUserAvatar, currentUserNickname, onComment, onRepost, onTagClick, onSeenTap, onAdOpen
}: {
  post: PostData; authorName?: string; authorAvatar?: string; currentUserAvatar?: string; currentUserNickname?: string;
  onAvatarTap?: (id: string) => void;
  onComment: (post: PostData) => void; onRepost: (post: PostData) => void;
  onTagClick?: (tag: string) => void;
  onSeenTap?: (post: PostData) => void;
  onAdOpen?: (post: PostData) => void;
}) => {
  const { user } = useAppContext();
  const { requestFeatureIntro } = useFeatureIntro();
  
  // Use real engagement hook
  const { counts, isLiked, isSaved, toggleLike, save, comment: addComment } = useEngagement({
    postId: post.id,
    initialCounts: {
      likes: post.likes || 0,
      comments: post.replies || 0,
      reshares: post.reposts || 0,
      saves: 0,
    },
  });
  
  const [bookmarked, setBookmarked] = useState(() => {
    try {
      const saved = localStorage.getItem("reelsy_saved_posts");
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) && parsed.includes(post.id);
      }
    } catch (e) {}
    return false;
  });

  const toggleBookmark = () => {
    const nextBookmarked = !bookmarked;
    setBookmarked(nextBookmarked);
    try {
      const saved = localStorage.getItem("reelsy_saved_posts");
      let list = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(list)) list = [];
      if (nextBookmarked) {
        if (!list.includes(post.id)) {
          list.push(post.id);
        }
        showToast("Post bookmarked!");
      } else {
        list = list.filter((id: string) => id !== post.id);
        showToast("Removed from bookmarks!");
      }
      localStorage.setItem("reelsy_saved_posts", JSON.stringify(list));
    } catch (e) {}
  };

  const handleReshare = async () => {
    // Prevent resharing your own post
    if (post.isUserPost || post.authorHandle === user?.username) {
      showToast("You can't reshare your own post");
      return;
    }
    try {
      onRepost(post);
    } catch (err) {
      showToast("Failed to reshare");
    }
  };

  // Deprecated - use engagement hook instead
  const liked = isLiked;
  const setLiked = () => toggleLike();

  const [showOptions, setShowOptions] = useState(false);
  const [burst, setBurst] = useState<{ x: number; y: number } | null>(null);
  const [hidden, setHidden] = useState(false);
  const [notInterestedActive, setNotInterestedActive] = useState(false);
  const [countdown, setCountdown] = useState(6);
  const [followed, setFollowed] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  const [reportDone, setReportDone] = useState(false);
  const [toast, setToast] = useState("");
  const [fullscreenMedia, setFullscreenMedia] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Countdown timer for Not Interested hidden state
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (notInterestedActive && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            setHidden(true);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [notInterestedActive, countdown]);

  const submitReport = () => {
    const effectiveReason = reportReason === "Other" ? customReason.trim() : reportReason;
    if (!effectiveReason) return;
    setIsSubmittingReport(true);
    setReportProgress(1);
    // Animate: 1% -> 6% -> 90% -> 100%
    const steps = [
      { pct: 6, delay: 300 },
      { pct: 90, delay: 900 },
      { pct: 100, delay: 1500 },
    ];
    steps.forEach(({ pct, delay }) => {
      setTimeout(() => setReportProgress(pct), delay);
    });
    setTimeout(() => {
      setIsSubmittingReport(false);
      setReportDone(true);
      setTimeout(() => setShowReport(false), 1600);
    }, 2100);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const handleDoubleTap = (e: React.MouseEvent) => {
    tapCount.current++;
    if (tapCount.current === 1) {
      tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 280);
    } else if (tapCount.current === 2) {
      clearTimeout(tapTimer.current!);
      tapCount.current = 0;
      if (!isLiked) {
        toggleLike();
        setBurst({ x: e.clientX, y: e.clientY });
        setTimeout(() => setBurst(null), 600);
      }
    }
  };

  const isUserPost = post.isUserPost;
  const isSponsoredPost = Boolean(post.isAd);
  const avatarUrl = isUserPost
    ? (currentUserAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=user&backgroundColor=b6e3f4`)
    : isSponsoredPost
      ? (post.adAvatar || reelsyLogo)
    : (authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.id}&backgroundColor=b6e3f4`);
  const displayName = isUserPost ? (currentUserNickname || "You") : isSponsoredPost ? (post.adBrandName || "Sponsor") : (authorName || "User");
  const displayHandle = isUserPost ? (user?.username ? `${user.username}` : "@you") : isSponsoredPost ? (post.adHandle || "@sponsor") : (post.id ? `@user` : "@user");
  const adMediaSrc = getAdMediaSrc(post);

  if (hidden) return null;

  if (notInterestedActive) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="px-4 py-6 bg-secondary/30 rounded-3xl border border-secondary/50 flex flex-col items-center justify-center gap-3.5 my-3 mx-4"
      >
        <div className="flex items-center gap-2.5">
          <EyeOff className="w-5 h-5 text-muted-foreground animate-pulse" />
          <span className="text-[13px] font-medium text-foreground">Post hidden. We'll show you fewer posts like this.</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              setNotInterestedActive(false);
              setCountdown(6);
            }} 
            className="px-4 py-1.5 rounded-full bg-foreground text-background text-[12px] font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            Undo
          </button>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-semibold">
            <span className="inline-block w-4 h-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin shrink-0" />
            Hiding in {countdown}s...
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="px-4 py-3 relative">
      {burst && <HeartBurst x={burst.x} y={burst.y} />}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-full bg-foreground text-background text-[12px] font-semibold shadow-xl whitespace-nowrap">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report sheet */}
      <AnimatePresence>
        {showReport && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[110]" onClick={() => !reportDone && setShowReport(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-[120] bg-background rounded-t-[28px] px-5 pt-4 pb-10">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-[15px]">Report {post.isAd ? "Ad" : "Post"}</p>
                {!reportDone && (
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowReport(false)}
                    className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <X className="w-3.5 h-3.5" />
                  </motion.button>
                )}
              </div>
              {reportDone ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center gap-3 py-8">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Check className="w-7 h-7 text-emerald-500" strokeWidth={2.5} />
                  </div>
                  <p className="font-bold text-[15px]">Report submitted</p>
                  <p className="text-[12px] text-muted-foreground text-center">Thank you for keeping Reelsy safe.</p>
                </motion.div>
              ) : isSubmittingReport ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8">
                  <p className="text-[13px] font-semibold mb-2 text-center">Submitting report...</p>
                  <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-rose-500 rounded-full"
                      animate={{ width: `${reportProgress}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                    {/* Shimmer light */}
                    <motion.div
                      className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                      animate={{ left: ["-20%", "120%"] }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center font-bold">{reportProgress}%</p>
                </motion.div>
              ) : (
                <>
                  <p className="text-[12px] text-muted-foreground mb-3">Why are you reporting this post?</p>
                  <div className="space-y-1.5 mb-4">
                    {REPORT_REASONS_POST.map((r) => (
                      <div key={r}>
                        <button onClick={() => { setReportReason(r); if (r !== "Other") setCustomReason(""); }}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left text-[13px] font-medium transition-all ${reportReason === r ? "bg-foreground text-background" : "bg-secondary"}`}>
                          {r}
                          {reportReason === r && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                        </button>
                        <AnimatePresence>
                          {r === "Other" && reportReason === "Other" && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22 }}
                              className="overflow-hidden mt-1.5"
                            >
                              <input
                                autoFocus
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder="Describe the issue..."
                                style={{ fontSize: 13 }}
                                className="w-full px-4 py-3 rounded-2xl bg-secondary outline-none font-medium placeholder:text-muted-foreground/50"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }}
                    disabled={!reportReason || (reportReason === "Other" && !customReason.trim())}
                    onClick={submitReport}
                    className="w-full py-3.5 rounded-full bg-rose-500 text-white font-bold text-[14px] disabled:opacity-40">
                    Submit Report
                  </motion.button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOptions && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30" onClick={() => setShowOptions(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 450, damping: 26 }}
              className="absolute right-3 top-8 z-40 bg-background rounded-2xl shadow-2xl overflow-hidden w-52 border border-secondary/60">
              {(post.isAd
                ? [
                    {
                      icon: EyeOff,
                      label: "Hide ad",
                      action: () => { setShowOptions(false); setCountdown(6); setNotInterestedActive(true); },
                    },
                    {
                      icon: Flag,
                      label: "Report ad",
                      danger: true,
                      action: () => { setShowOptions(false); setReportReason(""); setReportDone(false); setShowReport(true); },
                    },
                    {
                      icon: Link,
                      label: "Copy ad link",
                      action: () => {
                        navigator.clipboard?.writeText(post.adUrl || `https://reelsy.app/ad/${post.id}`).catch(() => { });
                        setShowOptions(false);
                        showToast("Ad link copied!");
                      },
                    },
                  ]
                : [
                    {
                      icon: EyeOff, label: "Not interested",
                      action: () => { setShowOptions(false); setCountdown(6); setNotInterestedActive(true); },
                    },
                    {
                      icon: Flag, label: "Report",
                      danger: true,
                      action: () => { setShowOptions(false); setReportReason(""); setReportDone(false); setShowReport(true); },
                    },
                    {
                      icon: followed ? UserMinus : UserCheck,
                      label: followed ? `Unfriend ${displayName}` : `BeFriend ${displayName}`,
                      action: () => {
                        setFollowed((f) => !f);
                        setShowOptions(false);
                        showToast(followed ? `Unfriend ${displayName}` : `Friend request sent to ${displayName}!`);
                      },
                    },
                    {
                      icon: VolumeX,
                      label: `Mute ${displayName}`,
                      action: () => {
                        const handle = post.authorHandle?.replace("@", "") || post.authorName || "";
                        if (user?.username && handle) {
                          api.blocks.mute(user.username, handle).catch(() => {});
                        }
                        setShowOptions(false);
                        showToast(`Muted ${displayName}`);
                      },
                    },
                    {
                      icon: ShieldOff,
                      label: `Block ${displayName}`,
                      danger: true,
                      action: () => {
                        const handle = post.authorHandle?.replace("@", "") || post.authorName || "";
                        if (user?.username && handle) {
                          api.blocks.block(user.username, handle).catch(() => {});
                        }
                        setShowOptions(false);
                        showToast(`Blocked ${displayName}`);
                      },
                    },
                    {
                      icon: Link, label: "Copy link",
                      action: () => {
                        navigator.clipboard?.writeText(`https://reelsy-com.vercel.app/post/${post.id}`).catch(() => { });
                        setShowOptions(false);
                        showToast("Link copied!");
                      },
                    },
                  ]
              ).map(({ icon: Icon, label, action, danger }: any, i: number) => (
                <button key={label} onClick={action}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left text-[13px] font-medium ${i > 0 ? "border-t border-secondary/40" : ""} ${danger ? "text-rose-500" : ""}`}>
                  <Icon className={`w-3.5 h-3.5 ${danger ? "text-rose-400" : "text-muted-foreground"}`} strokeWidth={1.8} />
                  {label}
                </button>
              ))}
            </motion.div>
          </>

)}
      </AnimatePresence>

      <div className="flex gap-3" onClick={handleDoubleTap}>
        <button
          className="shrink-0 self-start"
          onClick={(e) => {
            e.stopPropagation();
            if (post.isAd) {
              onAdOpen?.(post);
              return;
            }
          }}
        >
          <div className="w-9 h-9 rounded-full bg-secondary overflow-hidden">
            {isUserPost ? (
              currentUserAvatar?.startsWith("<")
                ? <div dangerouslySetInnerHTML={{ __html: currentUserAvatar }} className="w-full h-full" />
                : <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            )}
          </div>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (post.isAd) {
                    onAdOpen?.(post);
                    return;
                  }
                }}
                className="font-semibold text-[13px] truncate"
              >
                {displayName}
              </button>
              <span className="text-muted-foreground text-[11px] shrink-0">{displayHandle}</span>
              {post.aiGenerated && (
                <span className="shrink-0 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">
                  Ai
                </span>
              )}
              {post.isAd && (
                <span className="shrink-0 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold text-blue-500">
                  Ad
                </span>
              )}
              <span className="text-muted-foreground text-[11px] shrink-0">· {post.time}</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }} className="shrink-0 p-1 ml-1">
              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {post.content && <RichContent text={post.content} onTagClick={onTagClick} />}

          {post.location && (
            <div className="mb-3 flex w-fit items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-600">
              <MapPin className="h-3 w-3" />
              <span className="max-w-[180px] truncate">{post.location.name}</span>
            </div>
          )}

          {post.music && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-2xl bg-secondary/40 border border-secondary/50 w-fit">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isPlaying) {
                    audio?.pause();
                    setIsPlaying(false);
                  } else {
                    const a = audio || new Audio(post.music?.url);
                    a.play();
                    a.onended = () => setIsPlaying(false);
                    setAudio(a);
                    setIsPlaying(true);
                  }
                }}
                className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4 text-background fill-current" /> : <Play className="w-4 h-4 text-background fill-current" />}
              </button>
              <div className="min-w-0 pr-1">
                <p className="text-[11px] font-bold truncate leading-tight">{post.music.title}</p>
                <p className="text-[10px] text-muted-foreground truncate leading-tight">{post.music.artist}</p>
              </div>
            </div>
          )}

          {post.isAd && adMediaSrc && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdOpen?.(post);
              }}
              className="w-full text-left mb-2.5 rounded-2xl overflow-hidden border border-secondary/70 bg-secondary/30"
            >
              <div className="relative bg-secondary">
                {post.type === "video" ? (
                  <>
                    <video src={adMediaSrc} className="w-full aspect-video object-cover" muted loop autoPlay />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <div className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center">
                        <Play className="w-5 h-5 text-white fill-current" />
                      </div>
                    </div>
                  </>
                ) : (
                  <img src={adMediaSrc} alt="" className="w-full aspect-[4/3] object-cover" />
                )}
              </div>
              <div className="px-3 py-2.5 bg-secondary/45">
                <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">
                  {post.adDomain || "sponsor.reelsy"}
                </p>
                <p className="text-[12px] font-bold leading-snug">{post.adHeadline || displayName}</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                  {post.adDescription || "Open this sponsored post in Reelsy."}
                </p>
              </div>
            </button>
          )}

          {!post.isAd && post.media && (
            <div className="relative rounded-2xl overflow-hidden mb-2.5 bg-secondary group">
              {post.type === "image" ? (
                Array.isArray(post.media) ? (
                  <div className="relative aspect-square overflow-hidden flex">
                    {post.media.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt=""
                        onClick={() => { setMediaIndex(idx); setFullscreenMedia(true); }}
                        className={`w-full h-full object-cover shrink-0 transition-transform ${mediaIndex === idx ? "translate-x-0" : "translate-x-full"}`}
                        style={{ transform: `translateX(-${mediaIndex * 100}%)` }}
                      />
                    ))}
                    {post.media.length > 1 && (
                      <>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 rounded-full bg-black/20 backdrop-blur-sm">
                          {post.media.map((_, idx) => (
                            <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${mediaIndex === idx ? "bg-white w-3" : "bg-white/50"}`} />
                          ))}
                        </div>
                        {mediaIndex > 0 && (
                          <button onClick={(e) => { e.stopPropagation(); setMediaIndex(i => i - 1); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronLeft className="w-5 h-5 text-white" />
                          </button>
                        )}
                        {mediaIndex < post.media.length - 1 && (
                          <button onClick={(e) => { e.stopPropagation(); setMediaIndex(i => i + 1); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="w-5 h-5 text-white" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <img src={post.media} alt="" onClick={() => setFullscreenMedia(true)} className="w-full aspect-video object-cover" />
                )
              ) : (
                <div className="relative aspect-video bg-black" onClick={() => setFullscreenMedia(true)}>
                  <video src={typeof post.media === "string" ? post.media : post.media[0]} className="w-full h-full object-contain" muted loop autoPlay />
                  <div className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 backdrop-blur-sm">
                    <Video className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              )}
            </div>
          )}

          <AnimatePresence>
            {fullscreenMedia && post.type !== "text" && (
              <MediaViewer
                media={post.media!}
                type={post.type}
                initialIndex={mediaIndex}
                onClose={() => setFullscreenMedia(false)}
              />
            )}
          </AnimatePresence>

          {post.reshare && (
            <div className="mb-2.5 rounded-2xl border border-secondary/70 overflow-hidden">
              <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                <Share2 className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-[11px] font-semibold text-muted-foreground">{post.reshare.authorName}</span>
                <span className="text-[11px] text-muted-foreground">{post.reshare.authorHandle}</span>
              </div>
              <p className="text-[12px] leading-relaxed px-3 pb-2.5">{post.reshare.content}</p>
              {post.reshare.media && (
                <img src={Array.isArray(post.reshare.media) ? post.reshare.media[0] : post.reshare.media} alt="" className="w-full h-32 object-cover" />
              )}
            </div>
          )}

          {!post.isAd && post.likes > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] text-muted-foreground">
              {formatCount(post.likes + (isLiked ? 1 : 0))} likes
            </span>
          </div>
          )}

          {post.isAd ? (
            <div className="flex items-center justify-between -ml-1">
              <div className="flex items-center gap-4">
                <motion.button
                  whileTap={{ scale: 0.75 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike();
                  }}
                  className={`flex items-center gap-1 p-1 ${isLiked ? "text-rose-500" : "text-muted-foreground"}`}
                >
                  <motion.div
                    animate={isLiked ? { scale: [1, 1.45, 1] } : {}}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  >
                    <Heart className="w-4 h-4" strokeWidth={1.7} fill={isLiked ? "currentColor" : "none"} />
                  </motion.div>
                  <span className="text-[11px] font-medium">{counts.likes}</span>
                </motion.button>


                <motion.button
                  whileTap={{ scale: 0.8 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeenTap?.(post);
                  }}
                  className="flex items-center gap-1 p-1 text-muted-foreground"
                >
                  <BarChart3 className="w-4 h-4" strokeWidth={1.7} />
                  <span className="text-[11px] font-medium">Review</span>
                </motion.button>
                   <motion.button whileTap={{ scale: 0.8 }} onClick={(e) => { e.stopPropagation(); requestFeatureIntro(
                  "home_save_ad",
                  "Save Posts",
                  "Bookmark posts to read later. Build your personal collection!",
                  () => toggleBookmark()
                ); }}
                  className={`p-1 ${bookmarked ? "text-foreground" : "text-muted-foreground"}`}>
                  <Bookmark className="w-4 h-4" strokeWidth={1.7} fill={bookmarked ? "currentColor" : "none"} />
                </motion.button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between -ml-1">
              <div className="flex items-center gap-3">
                <motion.button whileTap={{ scale: 0.8 }} onClick={(e) => { e.stopPropagation(); onComment(post); }}
                  className="flex items-center gap-1 text-muted-foreground p-1">
                  <MessageCircle className="w-4 h-4" strokeWidth={1.7} />
                  <span className="text-[11px] font-medium">{counts.comments}</span>
                </motion.button>
                {/* Prevent resharing own posts */}
                {post.authorUsername !== user?.username && (
                  <motion.button whileTap={{ scale: 0.8 }} onClick={(e) => { e.stopPropagation(); handleReshare(); }}
                    className="flex items-center gap-1 text-muted-foreground p-1">
                    <Repeat2 className="w-4 h-4" strokeWidth={1.7} />
                    <span className="text-[11px] font-medium">{counts.reshares}</span>
                  </motion.button>
                )}
                <motion.button whileTap={{ scale: 0.75 }} onClick={(e) => { e.stopPropagation(); toggleLike(); }}
                  className={`flex items-center gap-1 p-1 ${isLiked ? "text-rose-500" : "text-muted-foreground"}`}>
                  <motion.div animate={isLiked ? { scale: [1, 1.45, 1] } : {}} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
                    <Heart className="w-4 h-4" strokeWidth={1.7} fill={isLiked ? "currentColor" : "none"} />
                  </motion.div>
                  <span className="text-[11px] font-medium">{counts.likes}</span>
                </motion.button>
                <motion.button whileTap={{ scale: 0.8 }} onClick={(e) => { e.stopPropagation(); save(); }}
                  className={`p-1 ${isSaved ? "text-foreground" : "text-muted-foreground"}`}>
                  <Bookmark className="w-4 h-4" strokeWidth={1.7} fill={isSaved ? "currentColor" : "none"} />
                </motion.button>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Eye className="w-3 h-3" strokeWidth={1.7} />
                <span className="text-[10px]">{formatCount(post.views)}</span>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

// ---- Emoji Rain ----
// Emoji rain feature removed per final requirements.

const HomeTab = ({ onNavVisible }: HomeTabProps) => {
  const { user } = useAppContext();
  const { requestFeatureIntro } = useFeatureIntro();
  const [feedType, setFeedType] = useState<"foryou" | "following">("foryou");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [newPostsPill, setNewPostsPill] = useState(false);

  // ---- Live Stories from API ----
  const [apiStories, setApiStories] = useState<StoryItem[]>([]);
  useEffect(() => {
    api.stories.getAll().then(({ stories }) => {
      const mapped: StoryItem[] = stories.map((s: any) => ({
        id: String(s._id),
        name: s.authorDisplayName || s.authorUsername || "User",
        avatarUrl: s.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.authorUsername}&backgroundColor=b6e3f4`,
        unread: true,
        authorUsername: s.authorUsername,
      }));
      // Deduplicate by authorUsername — show one ring per user
      const seen = new Set<string>();
      setApiStories(mapped.filter((s) => { if (seen.has(s.authorUsername)) return false; seen.add(s.authorUsername); return true; }));
    }).catch(() => {});
  }, []);
  const [refreshing, setRefreshing] = useState(false);
  const [showShineLoader, setShowShineLoader] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    setIsLoadingFeed(true);
    setVisibleCount(10);
    const t = setTimeout(() => {
      setIsLoadingFeed(false);
    }, 1200);
    return () => clearTimeout(t);
  }, [feedType, activeTag]);

  type SupportNotif = {
    reportId: string;
    category: string;
    userMessageSummary?: string;
    aiReply: string;
    createdAt: number;
    read: boolean;
  };

  const SUPPORT_NOTIFS_KEY = "reelsy_support_notifications";
  const SUPPORT_NOTIFS_UPDATED_AT_KEY = "reelsy_support_notifications_updatedAt";

  const [supportNotifs, setSupportNotifs] = useState<SupportNotif[]>([]);
  const [supportNotifDetail, setSupportNotifDetail] = useState<SupportNotif | null>(null);

  const supportUnreadCount = useMemo(
    () => supportNotifs.reduce((sum, n) => sum + (n.read ? 0 : 1), 0),
    [supportNotifs]
  );

  const [profileBot, setProfileBot] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [commentPost, setCommentPost] = useState<PostData | null>(null);
  const [userPosts, setUserPosts] = useState<PostData[]>(() => {
    try {
      const saved = localStorage.getItem("reelsy_user_posts");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // ---- Real MongoDB feed with cursor pagination ----
  const [apiFeedPosts, setApiFeedPosts] = useState<PostData[]>([]);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const [feedNextCursor, setFeedNextCursor] = useState<string | null>(null);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);

  const mapApiPost = (p: any): PostData => ({
    id: String(p._id || p.id),
    type: (p.type === "video" ? "video" : p.type === "image" ? "image" : "text") as "text" | "image" | "video",
    content: p.content || "",
    media: p.media || undefined,
    likes: p.likesCount ?? (Array.isArray(p.likes) ? p.likes.length : 0),
    replies: p.replyCount || 0,
    reposts: p.repostsCount ?? (Array.isArray(p.reposts) ? p.reposts.length : 0),
    views: p.views || 0,
    time: p.createdAt ? new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "recently",
    isUserPost: false,
    authorName: p.authorDisplayName || p.authorUsername || "User",
    authorHandle: p.authorUsername || "",
    authorUsername: p.authorUsername || "",
    authorAvatar: p.authorAvatar || undefined,
    music: p.music || undefined,
    location: p.location || undefined,
  });

  // Initial feed load + 30s polling for new posts from other users
  useEffect(() => {
    let cancelled = false;

    const loadInitial = async () => {
      try {
        const { posts, hasMore, nextCursor } = await api.posts.getFeed({ limit: 20 });
        if (cancelled) return;
        setApiFeedPosts(posts.map(mapApiPost));
        setFeedHasMore(hasMore);
        setFeedNextCursor(nextCursor);
      } catch { /* offline – no-op */ }
    };

    loadInitial();

    // Poll every 30 s for new posts (so friends see each other's posts automatically)
    let pollInFlight = false;
    const poll = setInterval(async () => {
      if (cancelled || pollInFlight) return;
      pollInFlight = true;
      try {
        const { posts } = await api.posts.getFeed({ limit: 20 });
        if (cancelled) return;
        const fresh = posts.map(mapApiPost);
        setApiFeedPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newOnes = fresh.filter((p) => !existingIds.has(p.id));
          if (newOnes.length === 0) return prev;
          setNewPostsPill(true);
          return [...newOnes, ...prev];
        });
      } catch { /* offline – no-op */ } finally {
        pollInFlight = false;
      }
    }, 30_000);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  const loadMorePosts = async () => {
    if (feedLoadingMore || !feedHasMore || !feedNextCursor) return;
    setFeedLoadingMore(true);
    try {
      const { posts, hasMore, nextCursor } = await api.posts.getFeed({ limit: 20, before: feedNextCursor });
      setApiFeedPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newPosts = posts.map(mapApiPost).filter((p) => !existingIds.has(p.id));
        return [...prev, ...newPosts];
      });
      setFeedHasMore(hasMore);
      setFeedNextCursor(nextCursor);
    } catch { /* offline */ } finally {
      setFeedLoadingMore(false);
    }
  };
  const [reshareTarget, setReshareTarget] = useState<PostData | null>(null);
  const [isSendingPost, setIsSendingPost] = useState(false);
  const [postSentFlash, setPostSentFlash] = useState(false);

  const [seenSheetPost, setSeenSheetPost] = useState<PostData | null>(null);
  const [browserOpenPost, setBrowserOpenPost] = useState<PostData | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  // Triple-tap friends feature removed.

  // Sync user posts from local storage (handles posting from Activity drafts)
  useEffect(() => {
    const readAndUpdate = () => {
      const saved = localStorage.getItem("reelsy_user_posts");
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) return;
        // Avoid re-render loop if data didn't actually change
        setUserPosts((prev) => {
          const prevIds = prev.map((p) => p.id).join("|");
          const nextIds = parsed.map((p: any) => p.id).join("|");
          return prevIds === nextIds ? prev : parsed;
        });
      } catch {
        // ignore
      }
    };

    // Initial load
    readAndUpdate();

    // Update when localStorage changes in another tab/window
    const onStorage = (e: StorageEvent) => {
      if (e.key === "reelsy_user_posts") readAndUpdate();
    };
    window.addEventListener("storage", onStorage);

    // Fallback (in case updates happen in the same tab and storage event doesn’t fire)
    const interval = window.setInterval(() => readAndUpdate(), 5000);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(interval);
    };
  }, []);


  const openComposer = (reshare?: PostData) => {
    setReshareTarget(reshare || null);
    setComposerOpen(true);
    onNavVisible?.(false);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setReshareTarget(null);
    onNavVisible?.(true);
  };

  const openComments = (post: PostData) => {
    setCommentPost(post);
    onNavVisible?.(false);
  };

  const closeComments = () => {
    setCommentPost(null);
    onNavVisible?.(true);
  };

  const openNotifs = () => {
    setNotifOpen(true);
    onNavVisible?.(false);
  };

  const loadSupportNotifs = () => {
    try {
      const raw = localStorage.getItem(SUPPORT_NOTIFS_KEY);
      if (!raw) {
        setSupportNotifs([]);
        return;
      }
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [];
      const normalized: SupportNotif[] = list
        .filter((x: any) => x && typeof x.reportId === "string" && typeof x.aiReply === "string")
        .map((x: any) => ({
          reportId: String(x.reportId),
          category: typeof x.category === "string" ? x.category : "General",
          userMessageSummary: typeof x.userMessageSummary === "string" ? x.userMessageSummary : undefined,
          aiReply: String(x.aiReply),
          createdAt: typeof x.createdAt === "number" ? x.createdAt : Number(x.createdAt || Date.now()),
          read: Boolean(x.read),
        }));

      normalized.sort((a, b) => b.createdAt - a.createdAt);
      setSupportNotifs(normalized);
    } catch {
      setSupportNotifs([]);
    }
  };

  const openSeenSheet = (post: PostData) => {
    setSeenSheetPost(post);
    onNavVisible?.(false);
  };

  const closeSeenSheet = () => {
    setSeenSheetPost(null);
    onNavVisible?.(true);
  };

  const openAdBrowser = (post: PostData) => {
    setSeenSheetPost(null);
    setBrowserOpenPost(post);
    onNavVisible?.(false);
  };

  const closeAdBrowser = () => {
    setBrowserOpenPost(null);
    onNavVisible?.(true);
  };

  const openProfile = (_id: string) => {
    setProfileBot(_id);
    onNavVisible?.(false);
  };

  const closeProfile = () => {
    setProfileBot(null);
    onNavVisible?.(true);
  };

  const closeNotifs = () => {
    setNotifOpen(false);
    onNavVisible?.(true);
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop < lastScrollY.current && el.scrollTop > 60) setNewPostsPill(true);
    if (el.scrollTop < 20) setNewPostsPill(false);
    lastScrollY.current = el.scrollTop;

    // Load more from API when near bottom
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) {
      loadMorePosts();
      setVisibleCount((prev) => prev + 10);
    }
  };

  const handleNewPost = async (postData: { type: "text" | "image" | "video"; content: string; media?: string | string[]; music?: { title: string; artist: string; url: string }; location?: { lat: number; lng: number; name: string }; aiGenerated?: boolean }) => {
    setIsSendingPost(true);
    const newPost: PostData = {
      id: `user-${Date.now()}`,
      type: postData.type,
      content: postData.content,
      media: postData.media,
      likes: 0, replies: 0, reposts: 0, views: 1,
      time: "just now",
      isUserPost: true,
      userAvatar: user?.avatar,
      music: postData.music,
      location: postData.location,
      aiGenerated: postData.aiGenerated,
      reshare: reshareTarget ? {
        authorName: reshareTarget.authorName || reshareTarget.authorHandle || "User",
        authorHandle: reshareTarget.authorHandle || "user",
        content: reshareTarget.content,
        media: reshareTarget.media,
      } : undefined,
    };

    // Optimistically add to feed immediately so the author sees it right away
    setApiFeedPosts((prev) => [newPost, ...prev]);

    // Persist to MongoDB so ALL users see it
    if (user?.username) {
      try {
        const created: any = await api.posts.create({
          authorUsername: user.username,
          authorDisplayName: user.nickname || user.username,
          authorAvatar: user.avatar,
          content: postData.content,
          type: postData.type,
          media: Array.isArray(postData.media) ? postData.media : postData.media ? [postData.media] : undefined,
          music: postData.music,
          location: postData.location,
        });
        // Replace the temp local ID with the real MongoDB ID so polling dedupes correctly
        const realId = String(created?._id || created?.id || newPost.id);
        if (realId !== newPost.id) {
          setApiFeedPosts((prev) =>
            prev.map((p) => (p.id === newPost.id ? { ...p, id: realId } : p))
          );
        }
      } catch (apiErr) {
        console.error("Failed to save post to backend:", apiErr);
        // Keep optimistic post visible — author still sees it locally
      }
    }

    setTimeout(() => {
      setIsSendingPost(false);
      setPostSentFlash(true);
      setTimeout(() => setPostSentFlash(false), 2200);
    }, 800);
  };

  const AD_POST_1: PostData = {
    id: "ad-1",
    isAd: true,
    type: "image",
    adBrandName: "Gadget Shopping",
    adHandle: "@gadgetshopping",
    adAvatar: "https://files.catbox.moe/qan43e.jpg",
    content: "Elevate your tech game and experience the extraordinary. From sleek smart devices to must-have accessories, we've got it all. Join the tech revolution now!\n\n#TechTrends #GadgetGuru #InnovationStation",
    adText: "Elevate your tech game and experience the extraordinary. From sleek smart devices to must-have accessories, we've got it all. Join the tech revolution now!",
    adMedia: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&auto=format&fit=crop",
    adDomain: "gadgetshopping.website",
    adUrl: "https://gadgetshopping.website",
    adHeadline: "Shop smart, shop #GadgetShopping.",
    adDescription: "Discover clean devices, creator gear, and daily tech essentials.",
    adCta: "Open Gadget Shopping",
    likes: 473,
    replies: 0,
    reposts: 0,
    views: 0,
    seenTotal: 8400000,
    worldSeen: [
      { region: "Africa", value: 2300000 },
      { region: "Europe", value: 1760000 },
      { region: "Asia", value: 2520000 },
      { region: "Americas", value: 1610000 },
      { region: "Oceania", value: 210000 },
    ],
    time: "Sponsored",
  };

  const AD_POST_2: PostData = {
    id: "ad-2",
    isAd: true,
    type: "image",
    adBrandName: "Creative Studio",
    adHandle: "@creativestudio",
    adAvatar: "https://files.catbox.moe/4f5a2c.jpg",
    content: "Transform your ideas into reality. Professional design tools made simple. Try free for 30 days. No credit card required.\n\n#Design #Creativity #DesignTools",
    adText: "Transform your ideas into reality with our suite of professional design tools.",
    adMedia: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=900&auto=format&fit=crop",
    adDomain: "creativestudio.app",
    adUrl: "https://creativestudio.app",
    adHeadline: "Design without limits",
    adDescription: "Everything creators need in one place.",
    adCta: "Start Creating Free",
    likes: 234,
    replies: 0,
    reposts: 0,
    views: 0,
    seenTotal: 5200000,
    worldSeen: [
      { region: "Africa", value: 1200000 },
      { region: "Europe", value: 1800000 },
      { region: "Asia", value: 1600000 },
      { region: "Americas", value: 600000 },
    ],
    time: "Sponsored",
  };

  const AD_POST_3: PostData = {
    id: "ad-3",
    isAd: true,
    type: "image",
    adBrandName: "CloudSync Pro",
    adHandle: "@cloudsyncpro",
    adAvatar: "https://files.catbox.moe/8e9f1a.jpg",
    content: "Never lose your data again. 99.9% uptime guarantee. Enterprise-grade security for everyone. Store, sync, share securely.\n\n#Security #CloudStorage #DataProtection",
    adText: "Keep your files safe in the cloud. Access anywhere, anytime.",
    adMedia: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&auto=format&fit=crop",
    adDomain: "cloudsync.pro",
    adUrl: "https://cloudsync.pro",
    adHeadline: "Your data, protected.",
    adDescription: "Enterprise security for individuals and teams.",
    adCta: "Get Started Now",
    likes: 156,
    replies: 0,
    reposts: 0,
    views: 0,
    seenTotal: 3800000,
    worldSeen: [
      { region: "Africa", value: 900000 },
      { region: "Europe", value: 1200000 },
      { region: "Asia", value: 1300000 },
      { region: "Americas", value: 400000 },
    ],
    time: "Sponsored",
  };

  const AD_POST_4: PostData = {
    id: "ad-4",
    isAd: true,
    type: "image",
    adBrandName: "DollarDevs",
    adHandle: "@dollardevs",
    adAvatar: "https://files.catbox.moe/8e9f1a.jpg",
    content: "We build the best website for local or international business, Dm us at Reelsy @dollarDevs.\n\n#Business #Website #Tech",
    adText: "We are available 24/7 anywhere, anytime, anyplace.",
    adMedia: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&auto=format&fit=crop",
    adDomain: "DollarDevs.vercel.app",
    adUrl: "https://DollarDevs.vercel.app",
    adHeadline: "Your Idea comes to life with DollarDevs.",
    adDescription: "Website making at your tips.",
    adCta: "Book us now",
    likes: 956,
    replies: 4,
    reposts: 7,
    views: 0,
    seenTotal: 9800000,
    worldSeen: [
      { region: "Nigeria", value: 2600000 },
      { region: "Norway", value: 1200000 },
      { region: "Ghana", value: 1300000 },
      { region: "Canada", value: 400000 },
      { region: "London", value: 40000 },
    ],
    time: "Sponsored",
  };

  // Feed = MongoDB posts only. userPosts (localStorage) retained for backward compat
  // but new posts go into apiFeedPosts directly so every user sees them.
  const mergedFeedPosts = useMemo(() => {
    const seen = new Set<string>();
    const out: PostData[] = [];
    // API posts first (primary source of truth)
    for (const p of apiFeedPosts) { if (!seen.has(p.id)) { seen.add(p.id); out.push(p); } }
    // Old localStorage posts as fallback (only if not already in API)
    for (const p of userPosts) { if (!seen.has(p.id)) { seen.add(p.id); out.push(p); } }
    return out;
  }, [apiFeedPosts, userPosts]);

  const allPosts: PostData[] = [
    ...mergedFeedPosts.slice(0, 4),
    AD_POST_1,
    ...mergedFeedPosts.slice(4, 8),
    AD_POST_2,
    ...mergedFeedPosts.slice(8, 14),
    AD_POST_3,
    ...mergedFeedPosts.slice(14, 20),
    AD_POST_4,
    ...mergedFeedPosts.slice(20),
  ];


  const userAvatarUrl = user?.avatar
    ? user.avatar
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || "user"}&backgroundColor=b6e3f4`;

  const NOTIFS = [
    { name: "Amara Osei", action: "liked your post", time: "2m", seed: "Amara" },
    { name: "Jay Rowe", action: "commented on your post", time: "15m", seed: "Jay" },
    { name: "Nova Reeves", action: "followed you", time: "1h", seed: "Nova" },
    { name: "Priya Nair", action: "reposted your content", time: "2h", seed: "Priya" },
    { name: "Kofi Asante", action: "mentioned you in a post", time: "3h", seed: "Kofi" },
  ];

  return (
    <div className="absolute inset-0 flex flex-col bg-background">
      {/* Emoji rain removed */}

      {/* Shining loader */}
      <AnimatePresence>
        {showShineLoader && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[250] h-[3px] overflow-hidden"
          >
            <motion.div
              className="absolute inset-y-0 bg-gradient-to-r from-transparent via-foreground to-transparent"
              style={{ width: "40%" }}
              animate={{ left: ["-40%", "140%"] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="absolute inset-0 bg-foreground/20" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="shrink-0 px-4 pt-3 pb-2 flex items-center justify-between">
        <img src={reelsyLogo} alt="Reelsy" className="w-7 h-7 rounded-xl object-cover" />
        <div className="flex bg-secondary p-[3px] rounded-full">
          {(["foryou", "following"] as const).map((t) => (
            <button key={t}
              onClick={() => {
                setFeedType(t);
                setActiveTag(null);
              }}
              className={`px-3.5 py-1 rounded-full text-[12px] font-semibold transition-all ${feedType === t && !activeTag ? "bg-background text-foreground" : "text-muted-foreground"}`}>
              {t === "foryou" ? "For You" : "Friends"}
            </button>
          ))}
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={openNotifs} className="relative p-1">
          <Bell className="w-[18px] h-[18px]" strokeWidth={1.8} />
          <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2.2, repeat: Infinity }}
            className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full" />
        </motion.button>
      </div>

      <AnimatePresence>
        {newPostsPill && (
          <motion.button initial={{ opacity: 0, y: -16, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16 }} transition={{ type: "spring", stiffness: 450, damping: 26 }}
            onClick={() => {
              setRefreshing(true);
              setShowShineLoader(true);
              setNewPostsPill(false);
              setTimeout(() => { setRefreshing(false); setShowShineLoader(false); }, 2000);
            }}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-foreground text-background text-[12px] font-semibold shadow-lg">
            <TrendingUp className="w-3.5 h-3.5" /> New posts
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {refreshing && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 28 }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-center shrink-0">
            <div className="flex gap-1">
              {[0, 0.15, 0.3].map((d, i) => (
                <motion.div key={i} animate={{ scaleY: [0.4, 1, 0.4] }} transition={{ duration: 0.6, repeat: Infinity, delay: d }}
                  className="w-1 h-4 bg-muted-foreground/30 rounded-full" />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overscroll-none pb-24">
        {/* Stories */}
        <div className="py-2.5 flex gap-4 px-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {/* My story / post button */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => openComposer()}
              className="w-[52px] h-[52px] rounded-full bg-secondary flex items-center justify-center overflow-hidden relative border-2 border-dashed border-secondary hover:border-foreground/20 transition-colors">
              {user?.avatar ? (
                user.avatar.startsWith("<")
                  ? <div dangerouslySetInnerHTML={{ __html: user.avatar }} className="w-full h-full" />
                  : <img src={user.avatar} alt="you" className="w-full h-full object-cover opacity-80" />
              ) : (
                <img src={userAvatarUrl} alt="you" className="w-full h-full object-cover opacity-80" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[1px]">
                <Plus className="w-5 h-5 text-foreground" strokeWidth={2.5} />
              </div>
            </motion.button>
            <span className="text-[10px] text-muted-foreground font-semibold">Post</span>
          </div>
          {apiStories.map((s) => (
            <motion.button key={s.id} whileTap={{ scale: 0.92 }}
              onClick={() => openProfile(s.id)}
              className="flex flex-col items-center gap-1 shrink-0">
              <div className={`w-[50px] h-[50px] rounded-full p-[2px] ${s.unread ? "bg-foreground" : "bg-secondary"}`}>
                <div className="w-full h-full rounded-full overflow-hidden bg-secondary ring-[2px] ring-background">
                  <img src={s.avatarUrl} alt={s.name} className="w-full h-full object-cover" />
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[52px]">{s.name}</span>
            </motion.button>
          ))}
        </div>

        {/* Trending tags */}
        <div className="flex gap-2 px-4 overflow-x-auto py-1.5" style={{ scrollbarWidth: "none" }}>
          {TAGS.map((tag) => (
            <motion.button key={tag} whileTap={{ scale: 0.93 }}
              onClick={() => setActiveTag(tag === activeTag ? null : tag)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${activeTag === tag ? "bg-blue-500 text-white" : "bg-secondary text-blue-500"}`}>
              {tag}
            </motion.button>
          ))}
        </div>

        <div className="h-px bg-secondary/60 mx-4 my-1" />

        {isLoadingFeed ? (
          <div className="space-y-1">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex gap-3 px-4 py-4 border-b border-secondary/40 animate-pulse">
                <div className="shrink-0 w-11 h-11 rounded-full bg-secondary" />
                <div className="flex-1 space-y-3 pt-1">
                  <div className="h-3 w-1/4 rounded-full bg-secondary" />
                  <div className="space-y-2">
                    <div className="h-3 w-11/12 rounded-full bg-secondary" />
                    <div className="h-3 w-4/5 rounded-full bg-secondary" />
                  </div>
                  <div className="flex gap-4 pt-1">
                    <div className="h-3 w-8 rounded-full bg-secondary" />
                    <div className="h-3 w-8 rounded-full bg-secondary" />
                    <div className="h-3 w-8 rounded-full bg-secondary" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          allPosts
            .filter((p) => !activeTag || p.content.includes(activeTag))
            .slice(0, visibleCount)
            .map((post, i) => (
              <motion.div key={post.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: Math.min(i * 0.04, 0.3) }}>
                <PostCard
                  post={post}
                  authorName={post.isUserPost ? undefined : post.authorName}
                  authorAvatar={post.isUserPost ? undefined : post.authorAvatar}
                  currentUserAvatar={post.isUserPost ? user?.avatar || userAvatarUrl : undefined}
                  currentUserNickname={post.isUserPost ? (user?.nickname || "You") : undefined}
                  onComment={openComments}
                  onRepost={openComposer}
                  onTagClick={setActiveTag}
                  onSeenTap={openSeenSheet}
                  onAdOpen={openAdBrowser}
                />
                <div className="h-px bg-secondary/40 mx-4" />
              </motion.div>
            ))
        )}

        {/* Load-more spinner */}
        {feedLoadingMore && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" />
          </div>
        )}
        {!feedLoadingMore && !feedHasMore && apiFeedPosts.length > 0 && (
          <p className="text-center text-[11px] text-muted-foreground/50 py-6">You're all caught up ✓</p>
        )}
      </div>

      {/* FAB */}
      <motion.button whileTap={{ scale: 0.86 }} onClick={() => requestFeatureIntro(
        "home_post_button",
        "Create a Post",
        "Share your thoughts, photos, and videos with the world! Tap the + button to start creating.",
        () => openComposer()
      )}
        className="absolute bottom-20 right-4 w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center shadow-xl z-20">
        <Plus className="w-4 h-4" strokeWidth={2.5} />
      </motion.button>

      {/* Post Composer */}
      <AnimatePresence>
        {composerOpen && (
          <PostComposer
            onClose={closeComposer}
            onPost={handleNewPost}
            resharePost={reshareTarget ? {
              authorName: reshareTarget.authorName || reshareTarget.authorHandle || "User",
              authorHandle: reshareTarget.authorHandle ? `@${reshareTarget.authorHandle}` : "@user",
              content: reshareTarget.content,
              media: reshareTarget.media,
            } : undefined}
          />
        )}
      </AnimatePresence>

      {/* Comments sheet */}
      <AnimatePresence>
        {commentPost && <CommentSheet post={commentPost} onClose={closeComments} />}
      </AnimatePresence>

      {/* Sponsored ad review */}
      <AnimatePresence>
        {seenSheetPost && (
          <AdInsightsSheet
            post={seenSheetPost}
            onClose={closeSeenSheet}
            onOpenBrowser={openAdBrowser}
          />
        )}
      </AnimatePresence>

      {/* Reelsy browser */}
      <AnimatePresence>
        {browserOpenPost && (
          <ReelsyAdBrowser post={browserOpenPost} onClose={closeAdBrowser} />
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {notifOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 z-40" onClick={closeNotifs} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="absolute bottom-0 left-0 right-0 z-50 bg-background rounded-t-[28px] px-4 pt-4 pb-10">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-[15px]">Notifications</p>
                <motion.button whileTap={{ scale: 0.9 }} onClick={closeNotifs}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              </div>
              <div className="space-y-1 max-h-80 overflow-y-auto overscroll-none">
                {NOTIFS.map((n, i) => (
                  <motion.button key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }} whileTap={{ backgroundColor: "hsl(var(--secondary)/0.5)" }}
                    className="w-full flex items-center gap-3 py-3 rounded-xl px-2 text-left">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${n.seed}&backgroundColor=b6e3f4`}
                      className="w-9 h-9 rounded-full bg-secondary shrink-0 object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] leading-snug">
                        <span className="font-semibold">{n.name}</span>{" "}
                        <span className="text-muted-foreground">{n.action}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{n.time} ago</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-foreground shrink-0" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomeTab;
