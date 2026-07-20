import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, Video, AtSign, Hash, Globe,Repeat2, ChevronDown, Loader2, Share2, Pin, Plus, Music, Search, Play, Pause, MapPin, Sparkles, Check, Crown, Undo2, Redo2, MessageSquare, ArrowRight } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useFeatureIntro } from "@/context/FeatureIntroContext";
import { generateText } from "@/lib/ai";

type ComposerPost = {
  type: "text" | "image" | "video";
  content: string;
  media?: string | string[];
  music?: { title: string; artist: string; url: string };
  location?: { lat: number; lng: number; name: string };
  aiGenerated?: boolean;
};

interface ResharePost {
  authorName: string;
  authorHandle: string;
  content: string;
  media?: string | string[];
}

interface PostComposerProps {
  onClose: () => void;
  onPost: (post: ComposerPost) => void;
  resharePost?: ResharePost;
}

const AUDIENCES = ["Everyone", "Friends", "Draft"];

const TRENDING_TAGS = [
  "#design", "#afrobeats", "#Lagos", "#AI", "#minimalism",
  "#creativity", "#startup", "#music", "#fashion", "#film",
  "#wellness", "#tech", "#culture", "#fyp", "#foryoupage", "#broadcast", "#reelsy", "#photography", "#travel",
  "#nature", "#fitness", "#food", "#art", "#lifestyle", "#coding", "#vlog", "#entertainment", "#business", "#growth", "#vibes", "#news",
  "#web3", "#reactjs", "#engineering", "#frontend", "#uidesign", "#ux", "#motivation", "#nigeria", "#musicproducer", "#songwriter", "#creativewriting", "#poetry", "#artgallery", "#indiegame", "#cybersecurity", "#cloud", "#developer", "#gamedev", "#marketing", "#seo", "#blockchain", "#cryptocurrency", "#nft", "#fitnessmotivation", "#healthyfood", "#recipes", "#travelphotography", "#wanderlust", "#adventure", "#naturelovers", "#architecturedesign", "#streetstyle"
];

const LIMITS = {
  free: 2,
  premium: 4,
  "premium+": 5,
  verified: 5
};

const PLACEHOLDERS = [
  "Share your ideas...",
  "What's on your mind?",
  "Tell your story...",
  "Spread some positivity...",
  "What's happening?",
  "Inspired? Write it down..."
];

const POST_AI_CONTEXT = `
You are Reelsy AI Assistant. You are a friendly, smart, and helpful companion on Reelsy. You can chat about anything, answer questions, or help the user brainstorm, write, and refine social media posts. Keep replies concise, engaging, natural, and helpful. You can use hashtags and emojis.
`;

const buildPollinationsImageUrl = (prompt: string) =>
  `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;

const PreviewContent = ({ text }: { text: string }) => {
  if (!text) return null;
  const parts = text.split(/([@#]\w+)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("#")) return <span key={i} className="text-blue-500 font-semibold">{part}</span>;
        if (part.startsWith("@")) return <span key={i} className="text-violet-500 font-semibold">{part}</span>;
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

const PostComposer = ({ onClose, onPost, resharePost }: PostComposerProps) => {
  const { user, tier, draftFirstTimeSeen, setDraftFirstTimeSeen } = useAppContext();
  const { requestFeatureIntro } = useFeatureIntro();
  const [content, setContent] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [audience, setAudience] = useState("Everyone");
  const [showAudience, setShowAudience] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [mentionSuggestions, setMentionSuggestions] = useState<{ name: string; handle: string }[]>([]);
  const [placeholder, setPlaceholder] = useState("");
  const [showMusicSheet, setShowMusicSheet] = useState(false);
  const [musicSearch, setMusicSearch] = useState("");
  const [musicResults, setMusicResults] = useState<any[]>([]);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<{ title: string; artist: string; url: string } | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [attachedLocation, setAttachedLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [showDraftWarning, setShowDraftWarning] = useState(false);
  const [draftDoNotShowAgain, setDraftDoNotShowAgain] = useState(true);
  const [aiEditMode, setAiEditMode] = useState(false);
  const [aiEditedContent, setAiEditedContent] = useState("");
  const [aiPrevContent, setAiPrevContent] = useState<string | null>(null);
  const [aiUsed, setAiUsed] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<{ id: number; from: "user" | "ai"; text: string; imageUrl?: string }[]>([]);
  const [aiChatInput, setAiChatInput] = useState("");
  const [isAiChatLoading, setIsAiChatLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [aiNotice, setAiNotice] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setPlaceholder(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
    const interval = setInterval(() => {
      setPlaceholder((prev) => {
        const index = PLACEHOLDERS.indexOf(prev);
        const nextIndex = (index + 1) % PLACEHOLDERS.length;
        return PLACEHOLDERS[nextIndex];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const canPost = content.trim().length > 0 || mediaUrls.length > 0 || resharePost;
  const charLimit = 280;
  const limit = LIMITS[tier as keyof typeof LIMITS] || 2;
  const charPct = Math.min(content.length / charLimit, 1);
  const charsLeft = charLimit - content.length;
  const hasHashOrAt = /([@#]\w+)/.test(content);
  const canUsePostAI = tier === "premium" || tier === "premium+" || tier === "gold";

  const ALL_MENTIONS = [
    { name: "Amara Osei", handle: "@amaraosei" },
    { name: "Jay Rowe", handle: "@jayrowe" },
    { name: "Nova Reeves", handle: "@novareeves" },
    { name: "Priya Nair", handle: "@priyanair" },
    { name: "Kofi Asante", handle: "@kofiasante" },
    { name: "Sofia Mendes", handle: "@sofiamendes" },
    { name: "Zara Ahmed", handle: "@zaraahmed" },
    { name: "Luca Ferri", handle: "@lucaferri" },
    { name: "Yemi Adebayo", handle: "@yemiadebayo" },
    { name: "Mia Chen", handle: "@miachen" },
    { name: "Elijah Brooks", handle: "@elijahbrooks" },
    { name: "Nadia Volkov", handle: "@nadiavolkov" },
  ];

  const detectSuggestions = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) { setTagSuggestions([]); setMentionSuggestions([]); return; }
    const pos = textarea.selectionStart;
    const before = text.slice(0, pos);
    const hashMatch = before.match(/#(\w*)$/);
    const atMatch = before.match(/@(\w*)$/);

    if (hashMatch) {
      const q = hashMatch[1].toLowerCase();
      setTagSuggestions(
        q.length === 0
          ? TRENDING_TAGS.slice(0, 6)
          : TRENDING_TAGS.filter((t) => t.slice(1).toLowerCase().startsWith(q)).slice(0, 6)
      );
      setMentionSuggestions([]);
    } else if (atMatch) {
      const q = atMatch[1].toLowerCase();
      setMentionSuggestions(
        q.length === 0
          ? ALL_MENTIONS.slice(0, 6)
          : ALL_MENTIONS.filter(
            (m) => m.name.toLowerCase().includes(q) || m.handle.slice(1).toLowerCase().startsWith(q)
          ).slice(0, 6)
      );
      setTagSuggestions([]);
    } else {
      setTagSuggestions([]);
      setMentionSuggestions([]);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, charLimit);
    setContent(val);
    detectSuggestions(val);

    // Detect //song// syntax
    const musicMatch = val.match(/\/\/([^/]+)\/\//);
    if (musicMatch && !selectedMusic) {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => {
        searchMusic(musicMatch[1], true);
      }, 600);
    }
  };

  const searchMusic = async (q: string, autoSelect = false) => {
    if (!q.trim()) return;
    setIsSearchingMusic(true);
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Network error");
      const data = await res.json();
      const results = data.results || [];
      setMusicResults(results);

      if (autoSelect && results.length > 0) {
        setSelectedMusic({ title: results[0].name, artist: results[0].artist_name, url: results[0].audio });
        setContent((c) => c.replace(/\/\/([^/]+)\/\//, "").trim());
      }
    } catch (e) {
      console.error("Music search failed", e);
      setMusicResults([]);
    } finally {
      setIsSearchingMusic(false);
    }
  };

  const insertSuggestion = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) { setContent((c) => c + tag + " "); setTagSuggestions([]); setMentionSuggestions([]); return; }
    const pos = textarea.selectionStart;
    const before = content.slice(0, pos);
    const after = content.slice(pos);
    const isHash = before.match(/#(\w*)$/);
    const isAt = before.match(/@(\w*)$/);
    const prefixLen = isHash ? isHash[0].length : isAt ? isAt[0].length : 0;
    const newContent = (before.slice(0, before.length - prefixLen) + tag + " " + after).slice(0, charLimit);
    setContent(newContent);
    setTagSuggestions([]);
    setMentionSuggestions([]);
    const newPos = before.length - prefixLen + tag.length + 1;
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = newPos;
    }, 0);
  };

  const handleImage = (file: File) => {
    if (mediaType === "video") { alert("Cannot add images to a video post."); return; }
    if (mediaUrls.length >= limit) { alert(`Your ${tier} plan only allows up to ${limit} images.`); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaUrls((p) => [...p, e.target?.result as string]);
      setMediaType("image");
    };
    reader.readAsDataURL(file);
  };

  const handleVideo = (file: File) => {
    if (mediaUrls.length > 0) { alert("Cannot add a video to a post with images."); return; }
    const url = URL.createObjectURL(file);
    const vid = document.createElement("video");
    vid.src = url;
    vid.onloadedmetadata = () => {
      if (vid.duration > 60) { alert("Videos must be 60 seconds or less."); URL.revokeObjectURL(url); return; }
      setVideoDuration(Math.round(vid.duration));
      const reader = new FileReader();
      reader.onload = (e) => { setMediaUrls([e.target?.result as string]); setMediaType("video"); };
      reader.readAsDataURL(file);
    };
  };

  const submitPost = async () => {
    if (!canPost || isPosting) return;
    
    setIsPosting(true);
    if (previewAudio) { previewAudio.pause(); setPreviewAudio(null); }

    try {
      // Upload any base64/blob media to the server so posts aren't stored as huge base64 strings
      const uploadedUrls = await Promise.all(
        mediaUrls.map(async (url) => {
          // Already a server URL (starts with http/https) — no re-upload needed
          if (url.startsWith('http://') || url.startsWith('https://')) return url;
          // Convert data URL or object URL to blob then upload
          try {
            const blob = await fetch(url).then((r) => r.blob());
            const ext = blob.type.split('/')[1]?.replace(/[^a-z0-9]/g, '') || 'bin';
            const formData = new FormData();
            formData.append('file', blob, `upload.${ext}`);
            const res = await fetch('/api/media/upload', { method: 'POST', body: formData });
            if (res.ok) {
              const { mediaUrl } = await res.json();
              return mediaUrl as string;
            }
          } catch (err) {
            console.error('Media upload failed, using local URL as fallback:', err);
          }
          return url; // fallback to local URL if upload fails
        })
      );

      if (audience === "Draft") {
        const newDraft = {
          id: `draft-${Date.now()}`,
          content: content.replace(/\/\/[^/]+\/\//, ""),
          mediaUrls: uploadedUrls,
          mediaType,
          music: selectedMusic || undefined,
          location: attachedLocation || undefined,
          aiGenerated: aiUsed,
          createdAt: Date.now()
        };
        const existing = localStorage.getItem("reelsy_drafts");
        const drafts = existing ? JSON.parse(existing) : [];
        localStorage.setItem("reelsy_drafts", JSON.stringify([newDraft, ...drafts]));
      } else {
        const finalContent = content.replace(/\/\/[^/]+\/\//, "").trim();
        onPost({
          type: mediaType || "text",
          content: finalContent,
          media: uploadedUrls.length > 0 ? (mediaType === "video" ? uploadedUrls[0] : uploadedUrls) : undefined,
          music: selectedMusic || undefined,
          location: attachedLocation || undefined,
          aiGenerated: aiUsed
        });
      }
    } catch (err) {
      console.error('Error submitting post:', err);
    } finally {
      setIsPosting(false);
      onClose();
    }
  };

  const handlePost = () => {
    if (!canPost || isPosting) return;

    if (audience === "Draft" && !draftFirstTimeSeen) {
      setDraftDoNotShowAgain(true);
      setShowDraftWarning(true);
      return;
    }

    if (resharePost) {
      requestFeatureIntro(
        "post_composer_reshare",
        "Reshare Post",
        "Share another post with your audience. Let them know what resonates with you!",
        () => submitPost()
      );
    } else {
      requestFeatureIntro(
        "post_composer_post",
        "Create a Post",
        "Share your thoughts, photos, and videos with the world! Your post will be visible to your selected audience.",
        () => submitPost()
      );
    }
  };

  // AI refinement for social media posts with a local fallback.
  const refineWithAI = async (input: string) => {
    try {
      const refined = await generateText(`${POST_AI_CONTEXT}
Refine this Reelsy post for clarity, warmth, and engagement. Keep it concise, natural, and safe. Return only the improved post text.

Post:
${input}`);
      if (refined) return refined.slice(0, charLimit);
    } catch (e) {
      console.error("AI refinement skipped, using local polish");
    }
    
    // Local smart refinement (always works)
    const cleaned = input.trim().replace(/\s+/g, " ");
    
    // Capitalize first letter
    let refined = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    
    // Add ending punctuation if missing
    if (!/[.!?]$/.test(refined)) {
      refined += ".";
    }
    
    // For very short posts, add engagement element
    if (cleaned.length < 50 && !refined.includes("?")) {
      refined = refined.replace(/\.$/, " 🎯");
    }
    
    // Clean up common redundancies
    refined = refined
      .replace(/\b(really\s+){2,}/gi, "really ")
      .replace(/\b(very\s+){2,}/gi, "very ")
      .replace(/([!?])\s+([!?])/g, "$1");
    
    return refined;
  };

  const generatePostIdea = async (input: string) => {
    try {
      const reply = await generateText(`${POST_AI_CONTEXT}
The user wants help creating a Reelsy post idea. Only discuss post ideas, captions, hooks, tone, and safe content. Keep the answer under 70 words.

User prompt:
${input}`);
      if (reply) return reply.slice(0, 500);
    } catch (e) {
      console.error("AI idea chat skipped, using local reply");
    }

    const topic = input.trim();
    return `Try opening with a real moment about ${topic}, then add one clear takeaway and end with a question people can answer quickly.`;
  };

  const onAiTap = async () => {
    if (!canUsePostAI) {
      setAiNotice("AI post writing is available for Premium and Premium+ members.");
      return;
    }

    if (!content.trim()) {
      setAiChatOpen(true);
      setAiChatMessages([{
        id: 1,
        from: "ai",
        text: "Hey! I'm your Reelsy AI assistant. You can chat with me about anything, ask questions, or tell me what's on your mind. I can also help you write and refine post ideas!"
      }]);
      return;
    }

    // Show inline loading state and refine automatically
    setAiEditMode(true);
    setAiEditedContent("");
    try {
      const refined = await refineWithAI(content);
      setAiEditedContent(refined);
    } catch (e) {
      console.error("AI refinement error:", e);
      setAiEditedContent("(AI refinement failed. Try again.)");
    }
  };

  const applyRefined = () => {
    setAiPrevContent(content);
    setContent(aiEditedContent);
    setAiUsed(true);
    setAiEditMode(false);
  };

  const undoAi = () => {
    if (!aiPrevContent) return;
    setContent(aiPrevContent);
    setAiPrevContent(null);
    // Keep aiUsed flag so user can reapply
  };

  const redoAi = () => {
    if (!aiEditedContent) return;
    setAiPrevContent(content);
    setContent(aiEditedContent);
    setAiUsed(true);
  };

  useEffect(() => {
    if (showMusicSheet && musicResults.length === 0 && !isSearchingMusic) {
      searchMusic("afrobeats");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMusicSheet]);

  const sendAiChat = async (text: string) => {
    if (!text.trim() || isAiChatLoading) return;
    const prompt = text.trim();
    setAiChatMessages((p) => [...p, { id: Date.now(), from: "user", text: prompt }]);
    setAiChatInput("");
    setIsAiChatLoading(true);
    const wantsImage = /\b(image|photo|picture|generate|draw|create|imagine)\b/i.test(prompt);
    if (wantsImage) {
      setAiChatMessages((p) => [
        ...p,
        {
          id: Date.now() + 1,
          from: "ai",
          text: "I made an image for your post. Tap Use image to attach it.",
          imageUrl: buildPollinationsImageUrl(prompt),
        },
      ]);
      setIsAiChatLoading(false);
      return;
    }
    const reply = await generatePostIdea(prompt);
    setAiChatMessages((p) => [...p, { id: Date.now() + 1, from: "ai", text: reply }]);
    setIsAiChatLoading(false);
    return;
    {
      const reply = `Idea: ${text.trim().charAt(0).toUpperCase() + text.trim().slice(1)} — try starting with a personal anecdote and end with a question to boost engagement.`;
      setAiChatMessages((p) => [...p, { id: p.length + 1, from: "ai", text: reply }]);
    }
  };

  const attachAiImage = async (imageUrl: string) => {
    if (mediaType === "video") {
      setAiNotice("Remove the video before attaching an AI image.");
      return;
    }
    if (mediaUrls.length >= limit) {
      setAiNotice(`Your ${tier} plan only allows up to ${limit} images.`);
      return;
    }

    setIsGeneratingImage(true);
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("Image generation failed");
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      setMediaUrls((p) => [...p, dataUrl]);
      setMediaType("image");
      setAiUsed(true);
      setAiChatOpen(false);
    } catch (error) {
      console.error("AI image attach failed", error);
      setAiNotice("Could not attach the generated image. Try again.");
    } finally {
      setIsGeneratingImage(false);
    }
  };
  
  const addLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setAttachedLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          name: `Location (${position.coords.latitude.toFixed(3)}, ${position.coords.longitude.toFixed(3)})`
        });
      }, (err) => {
        console.error("Location error:", err);
        // Mock location for demo
        setAttachedLocation({
          lat: 6.5244,
          lng: 3.3792,
          name: "Lagos, Nigeria"
        });
      });
    }
  };

  const insertTag = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) { setContent((c) => c + prefix); return; }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.slice(0, start) + prefix + content.slice(end);
    setContent(newContent.slice(0, charLimit));
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + prefix.length;
      detectSuggestions(newContent.slice(0, charLimit));
    }, 0);
  };

  const avatarUrl = user?.avatar
    ? user.avatar
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || "user"}&backgroundColor=b6e3f4`;

  const hasSuggestions = tagSuggestions.length > 0 || mentionSuggestions.length > 0;

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute inset-0 z-50 bg-background flex flex-col">
      <input ref={imageRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])} />
      <input ref={videoRef} type="file" accept="video/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleVideo(e.target.files[0])} />

      {/* Header */}
      <div className="shrink-0 border-b border-secondary/50 px-4 pt-5 pb-3">
        <div className="grid grid-cols-[36px_1fr_auto] items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <X className="w-4 h-4" />
          </motion.button>
          <p className="min-w-0 text-center font-bold text-[15px] truncate">{resharePost ? "Repost" : "New Post"}</p>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handlePost} disabled={!canPost || isPosting}
            className="px-4 py-2 rounded-full bg-foreground text-background text-[13px] font-bold disabled:opacity-40 flex items-center gap-1.5 shrink-0">
            {isPosting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isPosting 
              ? (audience === "Draft" ? "Drafting..." : "Posting...") 
              : (audience === "Draft" ? "Draft" : "Post")}
          </motion.button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="relative">
            <motion.button whileTap={{ scale: 0.93 }} onClick={() => setShowAudience(!showAudience)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-secondary text-[11px] font-semibold">
              <Globe className="w-3 h-3" /> {audience} <ChevronDown className="w-3 h-3" />
            </motion.button>
            <AnimatePresence>
              {showAudience && (
                <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-10" onClick={() => setShowAudience(false)} />
                  <motion.div initial={{ opacity: 0, scale: 0.9, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute left-0 top-9 z-20 bg-background rounded-2xl shadow-2xl overflow-hidden w-40 border border-secondary/60">
                    {AUDIENCES.map((a, i) => (
                      <button key={a} onClick={() => { setAudience(a); setShowAudience(false); }}
                        className={`w-full px-4 py-3 text-left text-[13px] font-medium ${i > 0 ? "border-t border-secondary/40" : ""} ${audience === a ? "font-bold" : ""}`}>
                        {a}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onAiTap}
            className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-colors flex items-center gap-1.5 ${
              canUsePostAI
                ? "border-violet-500/40 bg-violet-500/10 text-violet-600 hover:bg-violet-500/15"
                : "border-amber-500/30 bg-amber-500/10 text-amber-600"
            }`}>
            {!canUsePostAI && <Crown className="w-3 h-3" />}
            Ai
          </motion.button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none px-4">
        <div className="flex gap-3 pt-1">
          <div className="shrink-0 flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-secondary">
              {user?.avatar ? (
                user.avatar.startsWith("<")
                  ? <div dangerouslySetInnerHTML={{ __html: user.avatar }} className="w-full h-full" />
                  : <img src={user.avatar} alt="you" className="w-full h-full object-cover" />
              ) : (
                <img src={avatarUrl} alt="you" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="w-px flex-1 bg-secondary min-h-4" />
          </div>

          <div className="flex-1 min-w-0 pb-4">
            <p className="font-semibold text-[14px] mb-1">
              {user?.nickname || "You"}{" "}
              <span className="text-muted-foreground font-normal text-[12px]">
                {user?.username ? `@${user.username.replace(/^@/, "")}` : ""}
              </span>
            </p>

            {/* Show rich preview or textarea */}
            {hasHashOrAt && showPreview ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onClick={() => setShowPreview(false)}
                className="w-full text-[14px] leading-relaxed min-h-[60px] py-1 cursor-text">
                <PreviewContent text={content} />
              </motion.div>
            ) : (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onKeyUp={() => detectSuggestions(content)}
                onClick={() => detectSuggestions(content)}
                onBlur={() => { hasHashOrAt && setShowPreview(true); setTimeout(() => { setTagSuggestions([]); setMentionSuggestions([]); }, 200); }}
                onFocus={() => setShowPreview(false)}
                placeholder={resharePost ? "Add your thoughts..." : placeholder}
                autoFocus rows={3}
                className="w-full bg-transparent text-[14px] leading-relaxed outline-none resize-none placeholder:text-muted-foreground/50"
              />
            )}

            {/* AI undo/redo */}
            <div className="mt-2 flex items-center gap-2">
              {aiPrevContent && (
                <button onClick={undoAi} aria-label="Undo AI edit" className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
              )}
              {aiEditedContent && (
                <button onClick={redoAi} aria-label="Redo AI edit" className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              )}
              {aiUsed && (
                <span className="ml-auto text-[11px] text-500 font-semibold">AI generated</span>
              )}

            </div>

            {/* Tag / Mention suggestions */}
            <AnimatePresence>
              {hasSuggestions && (
                <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 450, damping: 26 }}
                  className="mb-2 rounded-2xl border border-secondary/60 bg-background shadow-lg overflow-hidden">
                  {tagSuggestions.length > 0 && (
                    <div className="p-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 pb-1">Trending Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {tagSuggestions.map((tag) => (
                          <motion.button key={tag} whileTap={{ scale: 0.93 }}
                            onMouseDown={(e) => { e.preventDefault(); insertSuggestion(tag); }}
                            className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[12px] font-semibold">
                            {tag}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                  {mentionSuggestions.length > 0 && mentionSuggestions.map((m) => (
                    <motion.button key={m.handle} whileTap={{ scale: 0.97 }}
                      onMouseDown={(e) => { e.preventDefault(); insertSuggestion(m.handle); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/50 transition-colors text-left">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}&backgroundColor=b6e3f4`}
                        className="w-7 h-7 rounded-full bg-secondary shrink-0" alt="" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[12px] truncate">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground">{m.handle}</p>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Media preview */}
            {mediaUrls.length > 0 && (
              <div className="mt-2 space-y-2">
                <div className={`grid gap-2 ${mediaUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {mediaUrls.map((url, i) => (
                    <div key={i} className="relative rounded-2xl overflow-hidden aspect-square bg-secondary">
                      {mediaType === "image" ? (
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <video src={url} className="w-full h-full object-cover" muted />
                      )}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          const next = [...mediaUrls];
                          next.splice(i, 1);
                          setMediaUrls(next);
                          if (next.length === 0) setMediaType(null);
                        }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm"
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </motion.button>
                      {mediaType === "video" && (
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold backdrop-blur-sm">
                          {videoDuration}s / 60s
                        </div>
                      )}
                    </div>
                  ))}
                  {mediaType === "image" && mediaUrls.length < limit && (
                    <button
                      onClick={() => imageRef.current?.click()}
                      className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-secondary hover:bg-secondary/30 transition-colors aspect-square"
                    >
                      <Plus className="w-6 h-6 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground font-bold mt-1">Add More</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Music badge */}
            {selectedMusic && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="mt-2 flex items-center gap-2 p-2 rounded-xl bg-secondary/50 border border-secondary w-fit">
                <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                  <Music className="w-4 h-4 text-background" />
                </div>
                <div className="min-w-0 pr-2">
                  <p className="text-[11px] font-bold truncate">{selectedMusic.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{selectedMusic.artist}</p>
                </div>
                <button onClick={() => setSelectedMusic(null)} className="p-1 rounded-full hover:bg-secondary">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}

            {resharePost && (
              <div className="mt-3 rounded-2xl border border-secondary/70 overflow-hidden">
                <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                  <Repeat2 className="w-3 h-3 text-muted-foreground shrink-0" />
                  <Share2 className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-[11px] font-semibold">{resharePost.authorName}</span>
                  <span className="text-[11px] text-muted-foreground">{resharePost.authorHandle}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground italic">Reshare</span>
                </div>
                <p className="text-[12px] leading-relaxed px-3 pb-2.5">{resharePost.content}</p>
                {resharePost.media && (
                  <img src={Array.isArray(resharePost.media) ? resharePost.media[0] : resharePost.media} alt="" className="w-full h-28 object-cover" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="shrink-0 border-t border-secondary/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => requestFeatureIntro(
            "post_composer_photo",
            "Add Photos",
            "Select photos from your device to include in your post.",
            () => imageRef.current?.click()
          )}
            className="p-2.5 rounded-full hover:bg-secondary transition-colors">
            <ImageIcon className="w-[18px] h-[18px] text-foreground" strokeWidth={1.8} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => requestFeatureIntro(
            "post_composer_video",
            "Add Videos",
            "Select videos from your device to include in your post.",
            () => videoRef.current?.click()
          )}
            className="p-2.5 rounded-full hover:bg-secondary transition-colors">
            <Video className="w-[18px] h-[18px] text-foreground" strokeWidth={1.8} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowMusicSheet(true)}
            className={`p-2.5 rounded-full hover:bg-secondary transition-colors ${selectedMusic ? "bg-secondary text-foreground" : ""}`}>
            <Music className={`w-[18px] h-[18px] ${selectedMusic ? "text-foreground" : "text-muted-foreground"}`} strokeWidth={1.8} />
          </motion.button>
          {(tier === "premium" || tier === "premium+" || tier === "gold") && (
            <motion.button whileTap={{ scale: 0.85 }} onClick={addLocation}
              className={`p-2.5 rounded-full hover:bg-secondary transition-colors ${attachedLocation ? "bg-secondary text-foreground" : ""}`}>
              <MapPin className={`w-[18px] h-[18px] ${attachedLocation ? "text-foreground" : "text-muted-foreground"}`} strokeWidth={1.8} />
            </motion.button>
          )}
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => insertTag("@")}
            className="p-2.5 rounded-full hover:bg-secondary transition-colors">
            <AtSign className="w-[18px] h-[18px] text-violet-500" strokeWidth={1.8} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => insertTag("#")}
            className="p-2.5 rounded-full hover:bg-secondary transition-colors">
            <Hash className="w-[18px] h-[18px] text-blue-500" strokeWidth={1.8} />
          </motion.button>
        </div>
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-5 h-5 -rotate-90">
            <circle cx="12" cy="12" r="9" fill="none" stroke="hsl(var(--secondary))" strokeWidth="2.5" />
            <circle cx="12" cy="12" r="9" fill="none"
              stroke={charsLeft < 20 ? "#ef4444" : "hsl(var(--foreground))"}
              strokeWidth="2.5" strokeDasharray={`${charPct * 56.5} 56.5`} strokeLinecap="round" />
          </svg>
          {charsLeft < 40 && (
            <span className={`text-[11px] font-semibold ${charsLeft < 10 ? "text-red-500" : "text-muted-foreground"}`}>
              {charsLeft}
            </span>
          )}
        </div>
      </div>

      {/* Music Sheet */}
      <AnimatePresence>
        {showMusicSheet && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setShowMusicSheet(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-background rounded-t-[32px] px-4 pt-4 pb-10 flex flex-col" style={{ maxHeight: "80%" }}>
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-[16px]">Add Music</p>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowMusicSheet(false)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              <div className="flex items-center gap-2 bg-secondary rounded-2xl px-4 py-3 mb-4">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  value={musicSearch}
                  onChange={(e) => {
                    const q = e.target.value;
                    setMusicSearch(q);
                    if (searchTimeout.current) clearTimeout(searchTimeout.current);
                    if (q.length >= 2) {
                      searchTimeout.current = setTimeout(() => {
                        searchMusic(q);
                      }, 500);
                    }
                  }}
                  placeholder="Search popular songs..."
                  className="flex-1 bg-transparent outline-none text-[14px] font-medium"
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto overscroll-none space-y-2">
                {isSearchingMusic ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : musicResults.map((track) => (
                  <div
                    key={track.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedMusic({ title: track.name, artist: track.artist_name, url: track.audio });
                      setShowMusicSheet(false);
                      if (previewAudio) { previewAudio.pause(); setPreviewAudio(null); setPlayingId(null); }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedMusic({ title: track.name, artist: track.artist_name, url: track.audio });
                        setShowMusicSheet(false);
                        if (previewAudio) { previewAudio.pause(); setPreviewAudio(null); setPlayingId(null); }
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary transition-colors text-left cursor-pointer"
                  >
                    <div className="relative w-12 h-12 rounded-xl bg-secondary overflow-hidden shrink-0 group">
                      <img src={track.image} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (playingId === track.id) {
                            previewAudio?.pause();
                            setPlayingId(null);
                          } else {
                            if (previewAudio) previewAudio.pause();
                            const audio = new Audio(track.audio);
                            audio.play();
                            audio.onended = () => setPlayingId(null);
                            setPreviewAudio(audio);
                            setPlayingId(track.id);
                          }
                        }}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {playingId === track.id ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[14px] truncate">{track.name}</p>
                      <p className="text-[12px] text-muted-foreground truncate">{track.artist_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AI Chat Modal (for empty content or idea brainstorming) */}
      <AnimatePresence>
        {aiChatOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[80] backdrop-blur-sm" onClick={() => setAiChatOpen(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-[90] bg-background rounded-t-[28px] px-4 pt-4 pb-6 max-h-[80vh]">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold">AI Post Ideas</p>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAiChatOpen(false)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><X className="w-3.5 h-3.5" /></motion.button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                {aiChatMessages.map((m) => (
                  <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-3 py-2 rounded-2xl ${m.from === 'user' ? 'bg-foreground text-background' : 'bg-secondary text-foreground'}`}>
                      {m.from === 'ai' && (
                        <span className="mb-1 inline-flex rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">Ai</span>
                      )}
                      <p className="text-[13px]">{m.text}</p>
                      {m.imageUrl && (
                        <img src={m.imageUrl} alt="AI generated" className="mt-2 aspect-square w-48 max-w-full rounded-2xl object-cover" />
                      )}
                      {m.from === 'ai' && (
                        <div className="mt-2 flex flex-wrap gap-3">
                          <button onClick={() => {
                            setContent((c) => (c ? c + '\n' : '') + m.text);
                            setAiUsed(true);
                            setAiChatOpen(false);
                          }} className="text-[12px] font-semibold text-violet-600">Use text</button>
                          {m.imageUrl && (
                            <button disabled={isGeneratingImage} onClick={() => attachAiImage(m.imageUrl!)}
                              className="text-[12px] font-semibold text-blue-600 disabled:opacity-50">
                              {isGeneratingImage ? "Attaching..." : "Use image"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isAiChatLoading && (
                  <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-2xl bg-secondary text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-[12px] font-medium">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input value={aiChatInput} onChange={(e) => setAiChatInput(e.target.value)} placeholder="Message AI assistant..." className="flex-1 px-4 py-2.5 rounded-2xl bg-secondary outline-none text-[13px]" />
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => sendAiChat(aiChatInput)} disabled={isAiChatLoading} className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center disabled:opacity-50 shrink-0">
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>



      <AnimatePresence>
        {aiNotice && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/45 z-[80] backdrop-blur-sm" onClick={() => setAiNotice("")} />
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              className="fixed top-1/2 left-1/2 z-[90] w-[88vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-amber-500/20 bg-background p-5 text-center shadow-2xl">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                <Crown className="h-6 w-6 text-amber-500" />
              </div>
              <p className="mb-2 text-[16px] font-bold">Premium AI Writing</p>
              <p className="mb-5 text-[13px] leading-relaxed text-muted-foreground">{aiNotice}</p>
              <button onClick={() => setAiNotice("")} className="w-full rounded-full bg-foreground py-3 text-[14px] font-semibold text-background">
                OK
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Location Badge */}
      {attachedLocation && (
        <div className="absolute top-16 left-4 right-4 z-40 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
          <p className="text-[12px] font-medium text-blue-600">{attachedLocation.name}</p>
          <button onClick={() => setAttachedLocation(null)} className="ml-auto">
            <X className="w-3 h-3 text-blue-500" />
          </button>
        </div>
      )}

      {/* Draft Warning Popup */}
      <AnimatePresence>
        {showDraftWarning && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[80] backdrop-blur-sm" onClick={() => setShowDraftWarning(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] bg-background rounded-3xl overflow-hidden shadow-2xl border border-secondary/40 max-w-sm w-[90vw]">
              <div className="px-5 py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
                  <Pin className="w-6 h-6 text-violet-500" />
                </div>
                <p className="font-bold text-[16px] mb-2">Draft Auto-Delete</p>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">Your drafts will automatically be deleted after 2 days. You can always save again or post them before they expire.</p>
                <button
                  onClick={() => setDraftDoNotShowAgain((v) => !v)}
                  className="mx-auto mb-5 flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-[12px] font-semibold"
                >
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${draftDoNotShowAgain ? "bg-foreground border-foreground" : "border-muted-foreground/40"}`}>
                    {draftDoNotShowAgain && <Check className="w-2.5 h-2.5 text-background" strokeWidth={3} />}
                  </span>
                  Don't show again
                </button>
                <div className="flex gap-2">
                  <button onClick={() => setShowDraftWarning(false)}
                    className="flex-1 py-3 rounded-full bg-secondary font-semibold text-[14px] hover:bg-secondary/80 transition-colors">
                    Cancel
                  </button>
                  <button onClick={() => {
                    setShowDraftWarning(false);
                    if (draftDoNotShowAgain) setDraftFirstTimeSeen(true);
                    submitPost();
                  }}
                    className="flex-1 py-3 rounded-full bg-foreground text-background font-semibold text-[14px]">
                    OK
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AI Refinement inline - shown in post composer area */}
      <AnimatePresence>
        {aiEditMode && aiEditedContent && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="fixed inset-0 z-[85] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
            <motion.div className="bg-background rounded-3xl shadow-2xl border border-secondary/40 w-full max-w-sm p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
               
                <p className="font-bold text-[14px]">AI Refinement</p>
              </div>
              
              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-secondary/50 border border-secondary">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1">Original</p>
                  <p className="text-[13px] leading-relaxed">{content}</p>
                </div>
                
                <div className="p-3 rounded-2xl bg-foreground/5 border border-foreground/10">
                  <p className="text-[11px] font-semibold text-violet-600 mb-1">Refined</p>
                  <p className="text-[13px] leading-relaxed text-foreground">{aiEditedContent}</p>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setAiEditMode(false); setAiEditedContent(""); }}
                  className="flex-1 py-2.5 rounded-full bg-secondary font-semibold text-[13px]">
                  Keep Original
                </button>
                <button onClick={applyRefined}
                  className="flex-1 py-2.5 rounded-full bg-violet-500 text-white font-semibold text-[13px] flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" />
                  Use
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Loading animation while AI is refining */}
      <AnimatePresence>
        {aiEditMode && !aiEditedContent && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="fixed inset-0 z-[85] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
            <motion.div className="w-full max-w-sm rounded-3xl bg-background p-5 shadow-2xl">
              <div className="mb-4 flex items-center gap-2">
                
                <p className="font-bold text-[14px]">Refining your post...</p>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-11/12 rounded-full bg-secondary overflow-hidden">
                  <motion.div className="h-full w-1/3 bg-gradient-to-r from-transparent via-violet-400 to-transparent"
                    animate={{ x: ["-120%", "320%"] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }} />
                </div>
                <div className="h-3 w-8/12 rounded-full bg-secondary overflow-hidden">
                  <motion.div className="h-full w-1/3 bg-gradient-to-r from-transparent via-violet-400 to-transparent"
                    animate={{ x: ["-120%", "320%"] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.12 }} />
                </div>
              </div>
              <p className="mt-4 text-[12px] font-medium text-muted-foreground">Your text is being polished for tone and clarity.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PostComposer;
