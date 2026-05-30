import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, Video, Bookmark, Clock, Edit2, Trash2, Camera, Film, Play, Heart, MessageCircle, ArrowRight } from "lucide-react";
import { BOTS, getBotAvatarUrl } from "@/data/bots";
import { useAppContext } from "@/context/AppContext";
import PostComposer from "../PostComposer";

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
  music?: { title: string; artist: string; url: string };
  reshare?: {
    authorName: string;
    authorHandle: string;
    content: string;
    media?: string | string[];
  };
}

interface DraftData {
  id: string;
  content: string;
  mediaUrls: string[];
  mediaType: "image" | "video" | null;
  music?: { title: string; artist: string; url: string };
  createdAt: number;
}

const ActivityTab = () => {
  const { user } = useAppContext();
  const [activeSubTab, setActiveSubTab] = useState<"pic" | "video" | "save" | "memory" | "draft">("pic");
  const [savedPosts, setSavedPosts] = useState<PostData[]>([]);
  const [userPosts, setUserPosts] = useState<PostData[]>([]);
  const [drafts, setDrafts] = useState<DraftData[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<DraftData | null>(null);

  // For editing drafts
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    const loadData = () => {
      // Load saved posts
      const saved = localStorage.getItem("reelsy_saved_posts");
      if (saved) setSavedPosts(JSON.parse(saved));

      // Load user posts
      const created = localStorage.getItem("reelsy_user_posts");
      if (created) setUserPosts(JSON.parse(created));

      // Load drafts
      const savedDrafts = localStorage.getItem("reelsy_drafts");
      if (savedDrafts) setDrafts(JSON.parse(savedDrafts));
    };

    loadData();
    window.addEventListener("storage", loadData);
    // Poll for changes in case storage events aren't firing on same tab
    const interval = setInterval(loadData, 1000);
    return () => {
      window.removeEventListener("storage", loadData);
      clearInterval(interval);
    };
  }, []);

  const deleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = drafts.filter((d) => d.id !== id);
    setDrafts(updated);
    localStorage.setItem("reelsy_drafts", JSON.stringify(updated));
  };

  const handleEditDraft = (draft: DraftData) => {
    setSelectedDraft(draft);
    setComposerOpen(true);
  };

  const handlePostFromDraft = (postData: { type: "text" | "image" | "video"; content: string; media?: string | string[]; music?: { title: string; artist: string; url: string } }) => {
    const newPost: PostData = {
      id: `user-${Date.now()}`,
      type: postData.type,
      content: postData.content,
      media: postData.media,
      likes: 0,
      replies: 0,
      reposts: 0,
      views: 1,
      time: "just now",
      isUserPost: true,
      userAvatar: user?.avatar,
      music: postData.music,
    };

    const updatedPosts = [newPost, ...userPosts];
    setUserPosts(updatedPosts);
    localStorage.setItem("reelsy_user_posts", JSON.stringify(updatedPosts));

    // Remove the draft we just posted
    if (selectedDraft) {
      const updatedDrafts = drafts.filter((d) => d.id !== selectedDraft.id);
      setDrafts(updatedDrafts);
      localStorage.setItem("reelsy_drafts", JSON.stringify(updatedDrafts));
    }

    setComposerOpen(false);
    setSelectedDraft(null);
  };

  const unsplashMemories = [
    {
      id: "mem-1",
      title: "1 Year Ago today...",
      content: "Chasing sunsets on the Lagos coast. Unforgettable vibes! 🌅",
      img: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&auto=format&fit=crop",
      date: "May 20, 2025"
    },
    {
      id: "mem-2",
      title: "6 Months Ago today...",
      content: "Late night coding sessions and aesthetic coffee runs. ☕💻",
      img: "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=400&auto=format&fit=crop",
      date: "Nov 20, 2025"
    },
    {
      id: "mem-3",
      title: "3 Months Ago today...",
      content: "Exploring the hidden gems of the city. Modern architecture is art. 🏢✨",
      img: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&auto=format&fit=crop",
      date: "Feb 20, 2026"
    }
  ];

  // Filters
  const userImages = userPosts.filter(p => p.type === "image");
  const savedImages = savedPosts.filter(p => p.type === "image");
  const allImages = [...userImages, ...savedImages];

  const userVideos = userPosts.filter(p => p.type === "video");
  const savedVideos = savedPosts.filter(p => p.type === "video");
  const allVideos = [...userVideos, ...savedVideos];

  return (
    <div className="absolute inset-0 flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-2 border-b border-secondary/50">
        <h1 className="text-[20px] font-bold text-foreground">Activity</h1>
        <p className="text-[12px] text-muted-foreground">Manage your memories, saves, and drafts</p>
      </div>

      {/* Sub-tabs bar */}
      <div className="shrink-0 flex justify-between px-4 py-2 bg-secondary/20">
        {[
          { id: "pic", label: "Pic", icon: ImageIcon },
          { id: "video", label: "Video", icon: Video },
          { id: "save", label: "Save", icon: Bookmark },
          { id: "memory", label: "Memory", icon: Clock },
          { id: "draft", label: "Draft", icon: Edit2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all relative ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeSubTabBg"
                  className="absolute inset-0 bg-secondary/60 rounded-xl -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-bold">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Scrollable content container */}
      <div className="flex-1 overflow-y-auto overscroll-none p-4 pb-24">
        <AnimatePresence mode="wait">
          {activeSubTab === "pic" && (
            <motion.div
              key="pic"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
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
            <motion.div
              key="video"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {allVideos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                  <Film className="w-12 h-12 mb-3 stroke-[1.2] opacity-60" />
                  <p className="text-[13px] font-semibold">No Video Activity</p>
                  <p className="text-[11px] max-w-[200px] mt-1">Videos you post or save will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {allVideos.map((post) => (
                    <div key={post.id} className="relative rounded-2xl overflow-hidden aspect-square bg-secondary shadow-sm border border-secondary/50 group">
                      <video src={Array.isArray(post.media) ? post.media[0] : post.media} className="w-full h-full object-cover" muted loop playsInline />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/45 transition-colors">
                        <Play className="w-8 h-8 text-white drop-shadow-md" fill="white" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 pointer-events-none">
                        <p className="text-[11px] text-white/90 line-clamp-2 leading-snug">{post.content}</p>
                        <span className="text-[9px] text-white/60 mt-1.5">{post.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeSubTab === "save" && (
            <motion.div
              key="save"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {savedPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                  <Bookmark className="w-12 h-12 mb-3 stroke-[1.2] opacity-60" />
                  <p className="text-[13px] font-semibold">No Bookmarks Saved</p>
                  <p className="text-[11px] max-w-[200px] mt-1">Bookmarked posts will show up in this folder.</p>
                </div>
              ) : (
                savedPosts.map((post) => (
                  <div key={post.id} className="flex gap-3 p-3 rounded-2xl bg-secondary/40 border border-secondary/50 hover:bg-secondary/60 transition-colors">
                    {post.media ? (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary shrink-0 relative">
                        {post.type === "video" ? (
                          <>
                            <video src={Array.isArray(post.media) ? post.media[0] : post.media} className="w-full h-full object-cover" muted />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Play className="w-4 h-4 text-white" fill="white" />
                            </div>
                          </>
                        ) : (
                          <img src={Array.isArray(post.media) ? post.media[0] : post.media} className="w-full h-full object-cover" alt="" />
                        )}
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-secondary/80 flex items-center justify-center shrink-0">
                        <Bookmark className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <p className="text-[12px] font-medium text-foreground truncate">{post.content || "Shared post"}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Saved · {post.time}</p>
                      </div>
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
            <motion.div
              key="memory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-2xl">
                <p className="text-[12px] text-violet-500 font-bold mb-1">🎉 Time Capsule</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">Look back at your favorite memories on Reelsy. Share them back to your feed to relive the moment!</p>
              </div>

              {unsplashMemories.map((mem) => (
                <div key={mem.id} className="rounded-3xl overflow-hidden border border-secondary bg-secondary/20 shadow-sm relative aspect-[4/3] group">
                  <img src={mem.img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-4">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-violet-400 mb-0.5">{mem.title}</span>
                    <p className="text-[13px] font-bold text-white leading-snug">{mem.content}</p>
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/10">
                      <span className="text-[10px] text-white/60">{mem.date}</span>
                      <button className="flex items-center gap-1 text-[10px] font-bold text-violet-400 hover:text-violet-300">
                        Share Memory <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeSubTab === "draft" && (
            <motion.div
              key="draft"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {drafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                  <Edit2 className="w-12 h-12 mb-3 stroke-[1.2] opacity-60" />
                  <p className="text-[13px] font-semibold">No Drafts Saved</p>
                  <p className="text-[11px] max-w-[200px] mt-1">Select "Draft" as audience in composer to save drafts here.</p>
                </div>
              ) : (
                drafts.map((draft) => (
                  <div
                    key={draft.id}
                    onClick={() => handleEditDraft(draft)}
                    className="p-3.5 rounded-2xl bg-secondary/40 border border-secondary/50 hover:bg-secondary/60 transition-colors flex items-start gap-3 cursor-pointer group"
                  >
                    {draft.mediaUrls.length > 0 ? (
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-secondary shrink-0 relative">
                        {draft.mediaType === "video" ? (
                          <video src={draft.mediaUrls[0]} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={draft.mediaUrls[0]} className="w-full h-full object-cover" alt="" />
                        )}
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-secondary/80 flex items-center justify-center shrink-0 text-muted-foreground">
                        <Edit2 className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground line-clamp-2 leading-relaxed">
                        {draft.content || <span className="text-muted-foreground/60 italic">Empty draft text</span>}
                      </p>
                      {draft.music && (
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">🎵 {draft.music.title} - {draft.music.artist}</p>
                      )}
                      <span className="text-[9px] text-muted-foreground/60 block mt-2">
                        Saved {new Date(draft.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={(e) => deleteDraft(draft.id, e)}
                      className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Editor Modal for Drafts */}
      <AnimatePresence>
        {composerOpen && selectedDraft && (
          <PostComposer
            onClose={() => {
              setComposerOpen(false);
              setSelectedDraft(null);
            }}
            onPost={handlePostFromDraft}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActivityTab;
