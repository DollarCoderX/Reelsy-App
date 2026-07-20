/**
 * RealDmView — full-screen DM UI matching the Reelsy mock chat style.
 * Features: real-time messages, E2E badge, voice recording, photo/video/doc upload,
 * typing indicator, search, and sticker support.
 */
import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Send, Loader2, Lock, Smile, Mic, MicOff, Phone, Search,
  MoreHorizontal, Plus, X, Image, Camera, Users, Calendar,
  FileText, Zap, Tag, StickerIcon, StopCircle,
} from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { useAppContext } from "@/context/AppContext";
import { EmojiStickerPicker } from "@/components/EmojiStickerPicker";
import { decodeBitmojiSticker, BitmojiStickerMessage } from "@/components/BitmojiAvatar";
import { uploadMedia } from "@/lib/api";

interface RealDmViewProps {
  conversationId: string;
  otherUsername: string;
  otherDisplayName: string;
  otherAvatar?: string;
  isHelpCenter?: boolean;
  isFriendsOnly?: boolean;
  isBlocked?: boolean;
  onBack: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch { return ""; }
}
function formatDateLabel(iso: string) {
  try {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
  } catch { return ""; }
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── Attachment menu items ─────────────────────────────────────────────────────
const ATTACH_ITEMS = [
  { key: "document",  label: "Document",         icon: FileText,    color: "bg-purple-600" },
  { key: "photo",     label: "Photos & videos",  icon: Image,       color: "bg-blue-500"   },
  { key: "camera",    label: "Camera",            icon: Camera,      color: "bg-emerald-500"},
  { key: "friends",   label: "Friends",           icon: Users,       color: "bg-cyan-500"   },
  { key: "event",     label: "Event",             icon: Calendar,    color: "bg-red-500"    },
  { key: "stickers",  label: "Emojis & Stickers", icon: StickerIcon, color: "bg-green-500"  },
  { key: "catalogue", label: "Catalogue",         icon: Tag,         color: "bg-indigo-500" },
  { key: "quick",     label: "Quick replies",     icon: Zap,         color: "bg-yellow-500" },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────
const RealDmView = ({
  conversationId,
  otherUsername,
  otherDisplayName,
  otherAvatar,
  isHelpCenter,
  isFriendsOnly,
  isBlocked: isBlockedProp,
  onBack,
}: RealDmViewProps) => {
  const { user } = useAppContext();
  const userId = user?.supabaseId || user?.username || "";
  const { messages, loading, sendMessage, sendTyping, isOtherTyping } = useMessages(conversationId);

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [blocked, setBlocked] = useState(isFriendsOnly || isBlockedProp || false);
  const [showPicker, setShowPicker] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // ── Voice recording state ─────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOtherTyping]);

  // Cleanup recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      mediaRecorderRef.current?.stop();
    };
  }, []);

  const avatarUrl = otherAvatar ||
    `https://api.dicebear.com/9.x/avataaars/svg?seed=${otherUsername}&backgroundColor=b6e3f4`;

  // ── Send text ────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || isSending || blocked) return;
    const text = input.trim();
    setInput("");
    setIsSending(true);
    try {
      await sendMessage(text, "text");
    } catch (err: any) {
      if (err?.code === "FRIENDS_ONLY" || String(err).includes("403")) setBlocked(true);
      setInput(text);
    } finally {
      setIsSending(false);
    }
  };

  // ── Typing indicator ─────────────────────────────────────────────────────────
  const handleInputChange = (val: string) => {
    setInput(val);
    sendTyping();
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {}, 2000);
  };

  // ── Voice recording ───────────────────────────────────────────────────────────
  const startRecording = async () => {
    if (blocked) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const ext = mimeType.includes("webm") ? "webm" : "mp4";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 200) return; // Too short, discard
        const file = new File([blob], `voice_${Date.now()}.${ext}`, { type: mimeType });
        setIsUploading(true);
        try {
          const url = await uploadMedia(file, file.name);
          if (url) await sendMessage(url, "text"); // send as text; client detects audio URL
        } catch {
          /* silently fail */
        } finally {
          setIsUploading(false);
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      // Microphone permission denied or not supported
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      // Remove the onstop handler so it doesn't upload
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // ── Media upload ─────────────────────────────────────────────────────────────
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || blocked) return;
    setShowAttach(false);
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadMedia(file, file.name);
        if (!url) continue;
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");
        await sendMessage(url, isVideo ? "video" : isImage ? "image" : "text");
      }
    } catch {
      /* ignore upload errors */
    } finally {
      setIsUploading(false);
    }
  }, [blocked, sendMessage]);

  // ── Attachment action dispatch ────────────────────────────────────────────────
  const handleAttach = (key: string) => {
    setShowAttach(false);
    if (key === "photo") photoInputRef.current?.click();
    else if (key === "document") docInputRef.current?.click();
    else if (key === "camera") cameraInputRef.current?.click();
    else if (key === "stickers") { setShowPicker(true); }
  };

  // ── Date grouping ────────────────────────────────────────────────────────────
  let lastDateLabel = "";

  // ── Filtered messages for search ──────────────────────────────────────────────
  const visibleMessages = searchQuery.trim()
    ? messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="absolute inset-0 z-30 bg-background flex flex-col">

      {/* ── Hidden file inputs ───────────────────────────────────────────────── */}
      <input ref={photoInputRef}  type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      <input ref={docInputRef}    type="file" className="hidden" onChange={e => handleFiles(e.target.files)} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFiles(e.target.files)} />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-3 pt-5 pb-3">
        <motion.button whileTap={{ scale: 0.88 }} onClick={onBack}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>

        <div className="relative shrink-0">
          {isHelpCenter ? (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-lg">
              🐋
            </div>
          ) : (
            <img src={avatarUrl} alt={otherDisplayName} className="w-10 h-10 rounded-full object-cover" />
          )}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-[14px] truncate">
            {isHelpCenter ? "Help Center" : otherDisplayName}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {isHelpCenter ? "Always here · AI-powered" : "Active recently"}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <motion.button whileTap={{ scale: 0.88 }}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <Phone className="w-4 h-4" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.88 }}
            onClick={() => { setShowSearch(v => !v); setSearchQuery(""); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showSearch ? "bg-foreground text-background" : "bg-secondary"}`}>
            <Search className="w-4 h-4" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.88 }}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <MoreHorizontal className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* ── Search bar ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="shrink-0 overflow-hidden px-4 pb-2">
            <div className="flex items-center gap-2 bg-secondary/60 rounded-2xl px-3 py-2">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search messages…"
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
              )}
            </div>
            {searchQuery && (
              <p className="text-[11px] text-muted-foreground mt-1 px-1">
                {visibleMessages.length} result{visibleMessages.length !== 1 ? "s" : ""}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages area ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overscroll-none px-3 py-2 space-y-1">
        {/* E2E encrypted badge */}
        <div className="flex flex-col items-center gap-1.5 py-3 select-none">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span className="text-[11px]">End-to-end encrypted</span>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {isHelpCenter && visibleMessages.length === 0 && !loading && (
          <div className="flex flex-col items-center gap-4 text-center py-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-3xl">🐋</div>
            <div>
              <p className="font-semibold text-[15px]">Reelsy Help Center</p>
              <p className="text-[13px] text-muted-foreground mt-1">Ask me anything about Reelsy —<br />I'm powered by AI and always available.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1 w-full max-w-xs">
              {["How do I post?", "Reset my password", "Change privacy settings", "Report a user"].map(q => (
                <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="px-3 py-2.5 bg-secondary rounded-2xl text-[12px] font-medium text-left hover:bg-secondary/80">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {visibleMessages.map((msg) => {
          const isMe = msg.sender_id === userId ||
            msg.sender_username === user?.username?.replace(/^@/, "");
          const dateLabel = formatDateLabel(msg.created_at);
          const showDateSep = dateLabel !== lastDateLabel;
          if (showDateSep) lastDateLabel = dateLabel;

          const bitmoji = decodeBitmojiSticker(msg.content ?? "");

          // Media type detection
          const isImageMsg = msg.message_type === "image" ||
            (!bitmoji && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(msg.content ?? ""));
          const isVideoMsg = msg.message_type === "video" ||
            (!bitmoji && /\.(mp4|mov|webm)(\?|$)/i.test(msg.content ?? ""));
          const isAudioMsg = !bitmoji && !isImageMsg && !isVideoMsg &&
            /\.(mp3|wav|webm|ogg|m4a|aac)(\?|$)/i.test(msg.content ?? "");
          const isDocMsg = !bitmoji && !isImageMsg && !isVideoMsg && !isAudioMsg &&
            /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar)(\?|$)/i.test(msg.content ?? "");

          return (
            <Fragment key={msg.id}>
              {showDateSep && (
                <div className="flex justify-center my-3 select-none">
                  <span className="px-3 py-1 rounded-full bg-secondary/80 text-[10px] font-bold text-muted-foreground shadow-sm">
                    {dateLabel}
                  </span>
                </div>
              )}

              <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} gap-0.5`}>
                {bitmoji ? (
                  <BitmojiStickerMessage text={msg.content} isMine={isMe} />
                ) : isImageMsg ? (
                  <div className={`max-w-[72%] rounded-2xl overflow-hidden ${isMe ? "rounded-br-sm" : "rounded-bl-sm"}`}>
                    <img src={msg.content} alt="photo" className="w-full max-h-72 object-cover" />
                  </div>
                ) : isVideoMsg ? (
                  <div className={`max-w-[72%] rounded-2xl overflow-hidden ${isMe ? "rounded-br-sm" : "rounded-bl-sm"}`}>
                    <video src={msg.content} controls className="w-full max-h-72 object-cover" />
                  </div>
                ) : isAudioMsg ? (
                  <div className={`max-w-[80%] rounded-2xl overflow-hidden px-3 py-2 flex items-center gap-3 ${isMe ? "bg-foreground text-background rounded-br-sm" : "bg-secondary rounded-bl-sm"}`}>
                    <Mic className="w-4 h-4 shrink-0" />
                    <audio src={msg.content} controls className="h-8 max-w-[180px]" />
                  </div>
                ) : isDocMsg ? (
                  <a href={msg.content} target="_blank" rel="noopener noreferrer"
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 flex items-center gap-2 text-[13px] font-medium ${isMe ? "bg-foreground text-background rounded-br-sm" : "bg-secondary rounded-bl-sm"}`}>
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate">{decodeURIComponent(msg.content.split("/").pop() || "Document")}</span>
                  </a>
                ) : (
                  <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed break-words ${
                    isMe
                      ? "bg-foreground text-background rounded-br-sm"
                      : isHelpCenter
                        ? "bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20 rounded-bl-sm"
                        : "bg-secondary rounded-bl-sm"
                  }`}>
                    {msg.content}
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground px-1">
                  {formatTime(msg.created_at)}
                </span>
              </div>
            </Fragment>
          );
        })}

        {/* Typing indicator */}
        {isOtherTyping && (
          <div className="flex items-end gap-2 mt-1">
            <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 mb-1" />
            <div className="bg-secondary rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1">
              {[0, 0.15, 0.3].map(d => (
                <motion.div key={d} className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                  animate={{ y: [-2, 2, -2] }} transition={{ duration: 0.8, repeat: Infinity, delay: d }} />
              ))}
            </div>
          </div>
        )}

        {isUploading && (
          <div className="flex justify-end">
            <div className="bg-secondary rounded-2xl px-4 py-2.5 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-[12px] text-muted-foreground">Uploading…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Blocked state ────────────────────────────────────────────────────── */}
      {blocked ? (
        <div className="shrink-0 px-4 py-4 border-t border-secondary/30">
          <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl px-4 py-3">
            <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[13px] font-medium">You can't message this account</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                @{otherUsername} only accepts messages from friends.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="shrink-0 relative">

          {/* ── Emoji/sticker picker ─────────────────────────────────────────── */}
          <AnimatePresence>
            {showPicker && (
              <EmojiStickerPicker
                onSelect={(content, type) => {
                  if (type === "sticker") {
                    setIsSending(true);
                    sendMessage(content, "text").finally(() => setIsSending(false));
                  } else {
                    setInput(p => p + content);
                  }
                }}
                onClose={() => setShowPicker(false)}
              />
            )}
          </AnimatePresence>

          {/* ── Attachment menu ──────────────────────────────────────────────── */}
          <AnimatePresence>
            {showAttach && (
              <>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-10" onClick={() => setShowAttach(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="absolute left-2 bottom-full mb-2 z-20 bg-[#1c1c1e] rounded-2xl shadow-2xl overflow-hidden min-w-[190px] border border-white/5"
                >
                  {ATTACH_ITEMS.map((item, i) => (
                    <motion.button
                      key={item.key}
                      whileTap={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                      onClick={() => handleAttach(item.key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${i < ATTACH_ITEMS.length - 1 ? "border-b border-white/5" : ""}`}
                    >
                      <div className={`w-8 h-8 rounded-full ${item.color} flex items-center justify-center shrink-0`}>
                        <item.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[14px] font-medium text-white">{item.label}</span>
                    </motion.button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* ── Recording UI ─────────────────────────────────────────────────── */}
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="px-3 pt-2 pb-2 flex items-center gap-3"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}
                  className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"
                />
                <span className="text-[13px] font-semibold text-red-500">
                  Recording {formatDuration(recordingDuration)}
                </span>
                <div className="flex-1" />
                <motion.button whileTap={{ scale: 0.88 }} onClick={cancelRecording}
                  className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                  <X className="w-4 h-4" />
                </motion.button>
                <motion.button whileTap={{ scale: 0.88 }} onClick={stopRecording}
                  className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center text-background">
                  <StopCircle className="w-4 h-4" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Input bar ────────────────────────────────────────────────────── */}
          {!isRecording && (
            <div className="px-3 pt-2 pb-7 flex items-end gap-2">
              {/* + / × button */}
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => { setShowAttach(v => !v); setShowPicker(false); }}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${showAttach ? "bg-foreground text-background" : "bg-secondary"}`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {showAttach
                    ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                        <X className="w-4 h-4" />
                      </motion.span>
                    : <motion.span key="plus" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                        <Plus className="w-4 h-4" />
                      </motion.span>
                  }
                </AnimatePresence>
              </motion.button>

              {/* Text input */}
              <div className="flex-1 flex items-end bg-secondary rounded-3xl px-3.5 py-2 min-h-[42px]">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => handleInputChange(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  onFocus={() => { setShowPicker(false); setShowAttach(false); }}
                  placeholder={isHelpCenter ? "Ask Help Center anything…" : "Message…"}
                  rows={1}
                  style={{ fontSize: 15, resize: "none" }}
                  className="flex-1 bg-transparent outline-none text-[14px] font-medium placeholder:text-muted-foreground/50 max-h-24 overflow-y-auto self-center"
                />
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => { setShowPicker(v => !v); setShowAttach(false); }}
                  className={`ml-1 self-center transition-colors ${showPicker ? "text-foreground" : "text-muted-foreground/60"}`}>
                  <Smile className="w-[18px] h-[18px]" />
                </motion.button>
              </div>

              {/* Send / Mic */}
              {input.trim() ? (
                <motion.button whileTap={{ scale: 0.85 }} onClick={handleSend}
                  disabled={isSending}
                  className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center shrink-0 disabled:opacity-40">
                  {isSending
                    ? <Loader2 className="w-4 h-4 text-background animate-spin" />
                    : <Send className="w-4 h-4 text-background" strokeWidth={2} />}
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={startRecording}
                  className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <Mic className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RealDmView;
