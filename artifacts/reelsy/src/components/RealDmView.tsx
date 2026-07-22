/**
 * RealDmView — full-screen DM matching Reelsy bot-chat style exactly.
 * All chat types use the same UI — no differentiation.
 * Features: voice/video call, reactions, reply-to, long-press context menu,
 * emoji/gif/sticker picker, camera capture, media preview, upload, read receipts.
 */
import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Send, Loader2, Lock, Smile, Mic, MicOff, Phone, Video,
  Search, MoreHorizontal, Plus, X, Image, Camera, FileText, Zap,
  StopCircle, Check, CheckCheck, Reply as ReplyIcon, Copy, Trash2,
  PhoneOff, VideoOff, Volume2, Crown, Forward as ForwardIcon,
  Download, SmileIcon, Repeat2, Calendar, User as UserIcon,
  ShoppingBag, Eye, EyeOff, Info, BellOff, UserX, Star,
} from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { useAppContext } from "@/context/AppContext";
import { uploadMedia } from "@/lib/api";
import { decodeBitmojiSticker, BitmojiStickerMessage } from "@/components/BitmojiAvatar";

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
  try { return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); } catch { return ""; }
}
function formatDateLabel(iso: string) {
  try {
    const d = new Date(iso); const today = new Date(); const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
  } catch { return ""; }
}
function formatDuration(secs: number) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

// ── GIF list — uses media2.giphy.com (newer, more reliable CDN endpoint) ───────
const MOCK_GIFS = [
  "https://media2.giphy.com/media/JIX9t2j0ZTN9S/200.gif",
  "https://media2.giphy.com/media/26BRsq6aK1YMRWBEY/200.gif",
  "https://media2.giphy.com/media/3oEjI6SIIHBdRxXI40/200.gif",
  "https://media2.giphy.com/media/ZqlnoxdnSFKOk/200.gif",
  "https://media2.giphy.com/media/7bnlL9h6Sn2kk/200.gif",
  "https://media2.giphy.com/media/xT9IgEx8SbX0teblYA/200.gif",
  "https://media2.giphy.com/media/l0MYEqEzw5aK9qvjG/200.gif",
  "https://media2.giphy.com/media/3NtY188QaxDdC/200.gif",
];

const STICKER_ROWS = [
  { name: "Fun", items: [
    "https://media2.giphy.com/media/JIX9t2j0ZTN9S/200.gif",
    "https://media2.giphy.com/media/26BRsq6aK1YMRWBEY/200.gif",
    "https://media2.giphy.com/media/3oEjI6SIIHBdRxXI40/200.gif",
    "https://media2.giphy.com/media/ZqlnoxdnSFKOk/200.gif",
    "https://media2.giphy.com/media/xT9IgEx8SbX0teblYA/200.gif",
    "https://media2.giphy.com/media/7bnlL9h6Sn2kk/200.gif",
  ] },
  { name: "Love", items: [
    "https://media2.giphy.com/media/l3q2K5jinAlChoCLS/200.gif",
    "https://media2.giphy.com/media/5xtDarmwsuR9sDROiuY/200.gif",
    "https://media2.giphy.com/media/ICOgUNjpvO0PC/200.gif",
    "https://media2.giphy.com/media/WS6CDvv96vCDK/200.gif",
    "https://media2.giphy.com/media/hvdaGMfgbKLfk/200.gif",
    "https://media2.giphy.com/media/3o6ZtayqNLLr6rS9te/200.gif",
  ] },
];

const EMOJI_GRID = ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😉","😊","🥰","😍","😘","😎","🥺","😭","😡","🤔","😈","👋","👍","👎","🙏","👏","💪","🔥","✨","🎉","💯","❤️","🧡","💛","💚","💙","💜","🖤","💔","💕","🎵","🎶","🚀","✈️","🌍","⚽","🏀","🎮","💎","🎁","🏆"];

const QUICK_REACTIONS = ["❤️","😂","😮","😢","😡","👍"];

// ── Attachment menu items ─────────────────────────────────────────────────────
const ATTACH_ITEMS = [
  { key: "photo",     label: "Photos & videos",  icon: Image,       color: "bg-blue-500"   },
  { key: "camera",    label: "Camera",            icon: Camera,      color: "bg-emerald-500"},
  { key: "document",  label: "Document",          icon: FileText,    color: "bg-purple-600" },
  { key: "gif",       label: "GIFs",              icon: Smile,       color: "bg-pink-500"   },
  { key: "stickers",  label: "Stickers",          icon: Star,        color: "bg-green-500"  },
  { key: "event",     label: "Event",             icon: Calendar,    color: "bg-red-500"    },
  { key: "contact",   label: "Friends",           icon: UserIcon,    color: "bg-cyan-500"   },
  { key: "quick",     label: "Quick replies",     icon: Zap,         color: "bg-yellow-500" },
] as const;

// ── Local VoiceCallOverlay — real WebRTC audio via Supabase signalling ─────────
const VoiceCallOverlay = ({
  name, avatar, onClose, conversationId, myUsername,
}: {
  name: string; avatar?: string; onClose: () => void;
  conversationId: string; myUsername: string;
}) => {
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [status, setStatus] = useState<"connecting" | "ringing" | "connected" | "failed">("connecting");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Capture local mic
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;

        // 2. Create peer connection with public STUN servers
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
          ],
        });
        pcRef.current = pc;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        // 3. Play remote audio when it arrives
        pc.ontrack = (e) => {
          if (!remoteAudioRef.current) remoteAudioRef.current = new Audio();
          remoteAudioRef.current.srcObject = e.streams[0];
          remoteAudioRef.current.play().catch(() => {});
          setStatus("connected");
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "failed") setStatus("failed");
          if (pc.connectionState === "connected") setStatus("connected");
        };

        // 4. Use Supabase channel as signalling layer
        const { supabase: sb } = await import("@/lib/supabase-client");
        const channelName = `voice-${conversationId}-${[myUsername, name].sort().join("-")}`;
        const ch = sb.channel(channelName, { config: { broadcast: { self: false } } });
        channelRef.current = ch;

        ch.on("broadcast", { event: "signal" }, async ({ payload }: any) => {
          if (!pcRef.current) return;
          try {
            if (payload.type === "offer") {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              const answer = await pcRef.current.createAnswer();
              await pcRef.current.setLocalDescription(answer);
              ch.send({ type: "broadcast", event: "signal", payload: { type: "answer", sdp: answer } });
              setStatus("connected");
            } else if (payload.type === "answer") {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            } else if (payload.type === "ice" && payload.candidate) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {});
            } else if (payload.type === "end") {
              onClose();
            }
          } catch {}
        });

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            ch.send({ type: "broadcast", event: "signal", payload: { type: "ice", candidate: e.candidate } });
          }
        };

        await ch.subscribe();

        // 5. Lower username acts as caller to break tie — sends offer
        if (myUsername.toLowerCase() < name.toLowerCase()) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ch.send({ type: "broadcast", event: "signal", payload: { type: "offer", sdp: offer } });
        }
        setStatus("ringing");
      } catch {
        setStatus("failed");
      }
    };

    init();
    const timer = setInterval(() => setDuration(d => d + 1), 1000);
    return () => {
      clearInterval(timer);
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
      channelRef.current?.send({ type: "broadcast", event: "signal", payload: { type: "end" } });
      channelRef.current?.unsubscribe();
      remoteAudioRef.current?.pause();
    };
  }, []);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const statusLabel = status === "connecting" ? "Connecting…" : status === "ringing" ? "Calling…" : status === "failed" ? "Call failed" : fmt(duration);

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(m => !m);
  };

  const handleEnd = () => {
    channelRef.current?.send({ type: "broadcast", event: "signal", payload: { type: "end" } });
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] flex flex-col items-center justify-between bg-gradient-to-b from-zinc-900 via-zinc-800 to-black pb-16 pt-20">
      <div className="flex flex-col items-center gap-4">
        <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2, repeat: Infinity }}
          className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-white/20 shadow-2xl bg-zinc-700">
          {avatar
            ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-white/30 text-5xl">{name[0]?.toUpperCase()}</div>}
        </motion.div>
        <div className="text-center">
          <p className="text-white text-[22px] font-bold">{name}</p>
          <p className="text-white/60 text-[14px] mt-1">{statusLabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <motion.button whileTap={{ scale: 0.85 }} onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center ${muted ? "bg-white text-black" : "bg-white/15 text-white"}`}>
          {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </motion.button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={handleEnd}
          className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
          <PhoneOff className="w-7 h-7 text-white" />
        </motion.button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => {}}
          className="w-14 h-14 rounded-full bg-white/15 text-white flex items-center justify-center">
          <Volume2 className="w-6 h-6" />
        </motion.button>
      </div>
    </motion.div>
  );
};

// ── Local VideoCallOverlay ────────────────────────────────────────────────────
const VideoCallOverlay = ({ name, avatar, tier, onClose }: { name: string; avatar?: string; tier: string; onClose: () => void }) => {
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  if (tier === "free") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 gap-5 px-8">
        <Crown className="w-12 h-12 text-amber-400" />
        <p className="text-white text-[20px] font-bold text-center">Premium Feature</p>
        <p className="text-white/60 text-[14px] text-center leading-relaxed">Video calls are available for Premium members.</p>
        <motion.button whileTap={{ scale: 0.95 }} onClick={onClose}
          className="px-8 py-3.5 rounded-full bg-white text-black font-bold text-[14px]">Got it</motion.button>
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] bg-black flex flex-col">
      <div className="flex-1 relative overflow-hidden bg-zinc-900">
        {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover opacity-70 scale-110" /> : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
        <div className="absolute top-5 left-5">
          <p className="text-white font-bold text-[16px]">{name}</p>
          <p className="text-white/60 text-[12px]">{fmt(duration)}</p>
        </div>
        <div className="absolute top-5 right-5 w-24 h-32 rounded-2xl overflow-hidden bg-zinc-800 ring-2 ring-white/20">
          {camOff ? <div className="w-full h-full flex items-center justify-center"><VideoOff className="w-8 h-8 text-white/30" /></div>
            : <div className="w-full h-full flex items-center justify-center"><Video className="w-8 h-8 text-white/30" /></div>}
        </div>
      </div>
      <div className="shrink-0 flex items-center justify-center gap-5 pb-14 pt-4 bg-black">
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => setMuted(!muted)}
          className={`w-14 h-14 rounded-full flex items-center justify-center ${muted ? "bg-white text-black" : "bg-white/15 text-white"}`}>
          {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </motion.button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={onClose}
          className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
          <PhoneOff className="w-7 h-7 text-white" />
        </motion.button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => setCamOff(!camOff)}
          className={`w-14 h-14 rounded-full flex items-center justify-center ${camOff ? "bg-white text-black" : "bg-white/15 text-white"}`}>
          {camOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </motion.button>
      </div>
    </motion.div>
  );
};

// ── Camera Capture Modal ──────────────────────────────────────────────────────
const CameraModal = ({ onClose, onCapture }: { onClose: () => void; onCapture: (dataUrl: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); setReady(true); }
      })
      .catch(() => setErr("Camera not available"));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current; const c = canvasRef.current;
    c.width = v.videoWidth || 640; c.height = v.videoHeight || 480;
    c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
    onCapture(c.toDataURL("image/jpeg", 0.9));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 bg-black flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-5 pb-3">
        <motion.button whileTap={{ scale: 0.88 }} onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <X className="w-4 h-4 text-white" />
        </motion.button>
        <p className="text-white font-semibold">Camera</p>
      </div>
      <div className="flex-1 relative overflow-hidden">
        {err ? <div className="flex items-center justify-center h-full text-white/40 text-sm">{err}</div>
          : <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      {ready && (
        <div className="shrink-0 flex items-center justify-center pb-16 pt-6 bg-black">
          <motion.button whileTap={{ scale: 0.88 }} onClick={capture}
            className="w-18 h-18 w-20 h-20 rounded-full bg-white flex items-center justify-center ring-4 ring-white/20">
            <Camera className="w-8 h-8 text-black" />
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

// ── Media Preview (before sending) ───────────────────────────────────────────
const MediaPreview = ({ src, isVideo, onSend, onClose }: { src: string; isVideo: boolean; onSend: (caption: string) => void; onClose: () => void }) => {
  const [caption, setCaption] = useState("");
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
      className="absolute inset-0 z-40 bg-black flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-5 pb-3">
        <motion.button whileTap={{ scale: 0.88 }} onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <X className="w-4 h-4 text-white" />
        </motion.button>
        <p className="text-white font-semibold flex-1">Preview</p>
      </div>
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {isVideo
          ? <video src={src} controls className="max-w-full max-h-full" />
          : <img src={src} alt="preview" className="max-w-full max-h-full object-contain" />}
      </div>
      <div className="shrink-0 flex items-center gap-2 px-3 pb-8 pt-3 bg-black/80">
        <input
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Add a caption…"
          className="flex-1 bg-white/10 rounded-3xl px-4 py-2.5 text-white text-[14px] outline-none placeholder:text-white/40"
        />
        <motion.button whileTap={{ scale: 0.88 }} onClick={() => onSend(caption)}
          className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shrink-0">
          <Send className="w-5 h-5 text-white" strokeWidth={2} />
        </motion.button>
      </div>
    </motion.div>
  );
};

// ── Emoji / GIF / Sticker Picker ──────────────────────────────────────────────
const EmojiGifPicker = ({
  onEmoji, onGif, onSticker, onClose,
}: { onEmoji: (e: string) => void; onGif: (url: string) => void; onSticker: (url: string) => void; onClose: () => void }) => {
  const [tab, setTab] = useState<"emoji" | "gif" | "sticker">("emoji");
  return (
    <>
      <motion.div className="fixed inset-0 z-10" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="absolute left-0 right-0 bottom-full mb-2 z-20 bg-[#1c1c1e] rounded-2xl shadow-2xl overflow-hidden border border-white/5 max-h-72 flex flex-col"
        style={{ minHeight: 200 }}
      >
        {/* Tabs */}
        <div className="shrink-0 flex border-b border-white/5">
          {(["emoji","gif","sticker"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${tab === t ? "text-white border-b-2 border-white" : "text-white/40"}`}>
              {t === "emoji" ? <SmileIcon className="w-4 h-4 mx-auto" /> : t === "gif" ? <span>GIF</span> : <Repeat2 className="w-4 h-4 mx-auto" />}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {tab === "emoji" && (
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_GRID.map(e => (
                <button key={e} onClick={() => onEmoji(e)}
                  className="w-full aspect-square flex items-center justify-center text-[22px] rounded-lg hover:bg-white/10 active:scale-90 transition-all">
                  {e}
                </button>
              ))}
            </div>
          )}
          {tab === "gif" && (
            <div className="grid grid-cols-2 gap-2">
              {MOCK_GIFS.map((url, i) => (
                <button key={i} onClick={() => onGif(url)}
                  className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-zinc-900 hover:scale-[1.02] active:scale-95 transition-all">
                  <img src={url} alt="gif" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {tab === "sticker" && (
            <div className="space-y-3">
              {STICKER_ROWS.map(row => (
                <div key={row.name}>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">{row.name}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {row.items.map((url, i) => (
                      <button key={i} onClick={() => onSticker(url)}
                        className="w-full aspect-square rounded-xl overflow-hidden bg-zinc-900 hover:scale-[1.03] active:scale-95 transition-all border border-zinc-800">
                        <img src={url} alt="sticker" className="w-full h-full object-contain p-1" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};

// ── Image Lightbox ────────────────────────────────────────────────────────────
const Lightbox = ({ src, onClose }: { src: string; onClose: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="absolute inset-0 z-50 bg-black flex flex-col" onClick={onClose}>
    <div className="flex items-center gap-3 px-4 pt-5 pb-3" onClick={e => e.stopPropagation()}>
      <motion.button whileTap={{ scale: 0.88 }} onClick={onClose}
        className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
        <X className="w-4 h-4 text-white" />
      </motion.button>
      <div className="flex-1" />
      <a href={src} download target="_blank" rel="noopener noreferrer"
        className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
        <Download className="w-4 h-4 text-white" />
      </a>
    </div>
    <div className="flex-1 flex items-center justify-center p-4">
      <img src={src} alt="media" className="max-w-full max-h-full object-contain rounded-xl" onClick={e => e.stopPropagation()} />
    </div>
  </motion.div>
);

// ── Chat More Menu ────────────────────────────────────────────────────────────
const ChatMenu = ({ name, onClose, onMute, onBlock, onClear }: { name: string; onClose: () => void; onMute: () => void; onBlock: () => void; onClear: () => void }) => (
  <>
    <motion.div className="fixed inset-0 z-30" onClick={onClose} />
    <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}
      className="absolute top-14 right-3 z-40 bg-[#1c1c1e] rounded-2xl shadow-2xl overflow-hidden min-w-[180px] border border-white/5">
      {[
        { icon: Info, label: "View profile" },
        { icon: BellOff, label: "Mute notifications", action: onMute },
        { icon: UserX, label: "Block @" + name, action: onBlock },
        { icon: Trash2, label: "Clear chat", action: onClear, red: true },
      ].map((item, i, arr) => (
        <motion.button key={item.label} whileTap={{ backgroundColor: "rgba(255,255,255,0.06)" }}
          onClick={() => { item.action?.(); onClose(); }}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left ${i < arr.length - 1 ? "border-b border-white/5" : ""} ${item.red ? "text-red-400" : "text-white"}`}>
          <item.icon className="w-4 h-4 shrink-0" />
          <span className="text-[13px] font-medium">{item.label}</span>
        </motion.button>
      ))}
    </motion.div>
  </>
);

// ── Context (long-press) menu ─────────────────────────────────────────────────
const ContextMenu = ({
  isMe, content, onReact, onReply, onCopy, onForward, onDelete, onClose,
}: {
  isMe: boolean; content: string;
  onReact: (emoji: string) => void; onReply: () => void; onCopy: () => void;
  onForward: () => void; onDelete: () => void; onClose: () => void;
}) => (
  <>
    <motion.div className="fixed inset-0 z-30" onClick={onClose} />
    <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
      className={`absolute ${isMe ? "right-1" : "left-1"} bottom-full mb-2 z-40 bg-[#1c1c1e] rounded-2xl shadow-2xl overflow-hidden border border-white/5`}
      style={{ minWidth: 180 }}>
      {/* Quick reactions */}
      <div className="flex items-center gap-1 px-3 py-2.5 border-b border-white/5">
        {QUICK_REACTIONS.map(e => (
          <button key={e} onClick={() => { onReact(e); onClose(); }}
            className="text-[22px] hover:scale-125 active:scale-110 transition-transform">{e}</button>
        ))}
      </div>
      {[
        { icon: ReplyIcon, label: "Reply", action: onReply },
        { icon: Copy, label: "Copy", action: onCopy },
        { icon: ForwardIcon, label: "Forward", action: onForward },
        ...(isMe ? [{ icon: Trash2, label: "Delete", action: onDelete, red: true }] : []),
      ].map((item, i, arr) => (
        <motion.button key={item.label} whileTap={{ backgroundColor: "rgba(255,255,255,0.06)" }}
          onClick={() => { item.action(); onClose(); }}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${i < arr.length - 1 ? "border-b border-white/5" : ""} ${(item as any).red ? "text-red-400" : "text-white"}`}>
          <item.icon className="w-4 h-4 shrink-0" />
          <span className="text-[13px] font-medium">{item.label}</span>
        </motion.button>
      ))}
    </motion.div>
  </>
);

// ── Main Component ────────────────────────────────────────────────────────────
const RealDmView = ({
  conversationId, otherUsername, otherDisplayName, otherAvatar,
  isHelpCenter, isFriendsOnly, isBlocked: isBlockedProp, onBack,
}: RealDmViewProps) => {
  const { user } = useAppContext();
  const userId = user?.supabaseId || user?.username || "";
  const tier = (user as any)?.tier || "free";
  const { messages, loading, sendMessage, sendTyping, isOtherTyping } = useMessages(conversationId);

  // ── Core state ──────────────────────────────────────────────────────────────
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [blocked, setBlocked] = useState(isFriendsOnly || isBlockedProp || false);
  const [isUploading, setIsUploading] = useState(false);

  // ── Call state ──────────────────────────────────────────────────────────────
  const [voiceCall, setVoiceCall] = useState(false);
  const [videoCall, setVideoCall] = useState(false);

  // ── UI panels ───────────────────────────────────────────────────────────────
  const [showPicker, setShowPicker] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  // ── Media ────────────────────────────────────────────────────────────────────
  const [mediaPreview, setMediaPreview] = useState<{ src: string; isVideo: boolean; file?: File } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // ── Voice recording ──────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Message interactions ─────────────────────────────────────────────────────
  const [contextMsg, setContextMsg] = useState<any | null>(null);
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const bottomRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avatarUrl = otherAvatar ||
    `https://api.dicebear.com/9.x/avataaars/svg?seed=${otherUsername}&backgroundColor=b6e3f4`;

  // Scroll to bottom
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isOtherTyping]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current?.stop();
  }, []);

  // ── Send text ────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || isSending || blocked) return;
    const text = input.trim();
    setInput("");
    setReplyTo(null);
    setIsSending(true);
    try {
      await sendMessage(text, "text");
    } catch (err: any) {
      if (err?.code === "FRIENDS_ONLY" || String(err).includes("403")) setBlocked(true);
      else setInput(text);
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
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const ext = mimeType.includes("webm") ? "webm" : "mp4";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 200) return;
        const file = new File([blob], `voice_${Date.now()}.${ext}`, { type: mimeType });
        setIsUploading(true);
        try {
          const url = await uploadMedia(file, file.name);
          if (url) await sendMessage(url, "text");
        } catch {} finally { setIsUploading(false); }
      };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } catch {}
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) { mediaRecorderRef.current.onstop = null; mediaRecorderRef.current.stop(); mediaRecorderRef.current = null; }
    setIsRecording(false);
    setRecordingDuration(0);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
  };

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFiles = useCallback(async (files: FileList | null, skipPreview = false) => {
    if (!files || blocked) return;
    setShowAttach(false);
    const file = files[0];
    if (!file) return;
    if (!skipPreview && (file.type.startsWith("image/") || file.type.startsWith("video/"))) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setMediaPreview({ src: ev.target?.result as string, isVideo: file.type.startsWith("video/"), file });
      };
      reader.readAsDataURL(file);
      return;
    }
    // Direct upload (documents, audio, or skipPreview)
    setIsUploading(true);
    try {
      for (const f of Array.from(files)) {
        const url = await uploadMedia(f, f.name);
        if (!url) continue;
        const isVideo = f.type.startsWith("video/");
        const isImage = f.type.startsWith("image/");
        await sendMessage(url, isVideo ? "video" : isImage ? "image" : "text");
      }
    } catch {} finally { setIsUploading(false); }
  }, [blocked, sendMessage]);

  // ── Send media from preview ────────────────────────────────────────────────
  const handleSendPreview = async (caption: string) => {
    if (!mediaPreview) return;
    setMediaPreview(null);
    setIsUploading(true);
    try {
      let url: string | null = null;
      if (mediaPreview.file) {
        url = await uploadMedia(mediaPreview.file, mediaPreview.file.name);
      }
      if (url) {
        await sendMessage(url, mediaPreview.isVideo ? "video" : "image");
        if (caption.trim()) await sendMessage(caption.trim(), "text");
      }
    } catch {} finally { setIsUploading(false); }
  };

  // ── Camera capture ─────────────────────────────────────────────────────────
  const handleCameraCapture = async (dataUrl: string) => {
    setShowCamera(false);
    // Convert dataUrl to file then show preview
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], `camera_${Date.now()}.jpg`, { type: "image/jpeg" });
    setMediaPreview({ src: dataUrl, isVideo: false, file });
  };

  // ── Attachment action ──────────────────────────────────────────────────────
  const handleAttach = (key: string) => {
    setShowAttach(false);
    if (key === "photo") photoInputRef.current?.click();
    else if (key === "document") docInputRef.current?.click();
    else if (key === "camera") setShowCamera(true);
    else if (key === "gif" || key === "stickers") setShowPicker(true);
    else if (key === "quick") {
      const replies = ["Sure!", "On my way 🚗", "Be right back ⏰", "Can't talk now 📵", "👍", "❤️"];
      setInput(replies[Math.floor(Math.random() * replies.length)]);
      inputRef.current?.focus();
    }
  };

  // ── Long-press handlers ───────────────────────────────────────────────────
  const handlePointerDown = (msg: any) => {
    longPressTimer.current = setTimeout(() => setContextMsg(msg), 500);
  };
  const handlePointerUp = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  // ── Date grouping ────────────────────────────────────────────────────────────
  let lastDateLabel = "";

  const visibleMessages = searchQuery.trim()
    ? messages.filter(m => !deletedIds.has(m.id) && m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages.filter(m => !deletedIds.has(m.id));

  return (
    <div className="absolute inset-0 z-30 bg-background flex flex-col">

      {/* ── Hidden file inputs ───────────────────────────────────────────────── */}
      <input ref={photoInputRef} type="file" accept="image/*,video/*" multiple className="hidden"
        onChange={e => handleFiles(e.target.files)} />
      <input ref={docInputRef} type="file" className="hidden"
        onChange={e => handleFiles(e.target.files, true)} />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-3 pt-5 pb-3">
        <motion.button whileTap={{ scale: 0.88 }} onClick={onBack}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>

        <div className="relative shrink-0">
          {isHelpCenter
            ? <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-lg">🐋</div>
            : <img src={avatarUrl} alt={otherDisplayName} className="w-10 h-10 rounded-full object-cover" />}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-[14px] truncate">{isHelpCenter ? "Help Center" : otherDisplayName}</p>
          <p className="text-[11px] text-muted-foreground">{isHelpCenter ? "Always here · AI-powered" : "Active recently"}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setVoiceCall(true)}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <Phone className="w-4 h-4" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setVideoCall(true)}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <Video className="w-4 h-4" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.88 }}
            onClick={() => { setShowSearch(v => !v); setSearchQuery(""); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showSearch ? "bg-foreground text-background" : "bg-secondary"}`}>
            <Search className="w-4 h-4" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setShowChatMenu(v => !v)}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <MoreHorizontal className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* ── Chat More Menu ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showChatMenu && (
          <ChatMenu name={otherUsername} onClose={() => setShowChatMenu(false)}
            onMute={() => {}} onBlock={() => setBlocked(true)}
            onClear={() => { /* clear local view */ setShowChatMenu(false); }} />
        )}
      </AnimatePresence>

      {/* ── Search bar ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="shrink-0 overflow-hidden px-4 pb-2">
            <div className="flex items-center gap-2 bg-secondary/60 rounded-2xl px-3 py-2">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search messages…"
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground" />
              {searchQuery && <button onClick={() => setSearchQuery("")}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
            </div>
            {searchQuery && <p className="text-[11px] text-muted-foreground mt-1 px-1">{visibleMessages.length} result{visibleMessages.length !== 1 ? "s" : ""}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages area ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overscroll-none px-3 py-2">
        {/* E2E badge */}
        <div className="flex flex-col items-center gap-1.5 py-3 select-none">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Lock className="w-3 h-3" /><span className="text-[11px]">End-to-end encrypted</span>
          </div>
        </div>

        {loading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}

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
                  className="px-3 py-2.5 bg-secondary rounded-2xl text-[12px] font-medium text-left hover:bg-secondary/80">{q}</button>
              ))}
            </div>
          </div>
        )}

        {visibleMessages.map((msg) => {
          const isMe = msg.sender_id === userId || msg.sender_username === user?.username?.replace(/^@/, "");
          const dateLabel = formatDateLabel(msg.created_at);
          const showDateSep = dateLabel !== lastDateLabel;
          if (showDateSep) lastDateLabel = dateLabel;
          const bitmoji = decodeBitmojiSticker(msg.content ?? "");
          const isImageMsg = msg.message_type === "image" || (!bitmoji && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(msg.content ?? ""));
          const isVideoMsg = msg.message_type === "video" || (!bitmoji && /\.(mp4|mov|webm)(\?|$)/i.test(msg.content ?? ""));
          const isAudioMsg = !bitmoji && !isImageMsg && !isVideoMsg && /\.(mp3|wav|webm|ogg|m4a|aac)(\?|$)/i.test(msg.content ?? "");
          const isDocMsg = !bitmoji && !isImageMsg && !isVideoMsg && !isAudioMsg && /\.(pdf|doc|docx|xls|xlsx|ppt|txt|zip|rar)(\?|$)/i.test(msg.content ?? "");
          const isStickerGif = !bitmoji && !isAudioMsg && !isDocMsg && !isImageMsg && !isVideoMsg && msg.content?.startsWith("https://media.giphy.com");
          const reaction = reactions[msg.id];
          const isContextOpen = contextMsg?.id === msg.id;

          return (
            <Fragment key={msg.id}>
              {showDateSep && (
                <div className="flex justify-center my-3 select-none">
                  <span className="px-3 py-1 rounded-full bg-secondary/80 text-[10px] font-bold text-muted-foreground">{dateLabel}</span>
                </div>
              )}

              <div className={`relative flex flex-col ${isMe ? "items-end" : "items-start"} gap-0.5 mb-1`}>
                {/* Reply-to indicator */}
                {(msg as any).replyTo && (
                  <div className={`px-2.5 py-1.5 rounded-xl bg-secondary/50 mb-0.5 max-w-[78%] border-l-2 border-foreground/30 ${isMe ? "mr-1" : "ml-1"}`}>
                    <p className="text-[10px] font-semibold text-muted-foreground">{(msg as any).replyTo.sender_username || "Them"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{(msg as any).replyTo.content}</p>
                  </div>
                )}

                {bitmoji ? (
                  <BitmojiStickerMessage text={msg.content} isMine={isMe} />
                ) : isStickerGif ? (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    onPointerDown={() => handlePointerDown(msg)} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
                    className="w-32 h-32 rounded-2xl overflow-hidden cursor-pointer active:scale-95 transition-transform">
                    <img src={msg.content} className="w-full h-full object-contain" alt="sticker/gif" />
                  </motion.div>
                ) : isImageMsg ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    onPointerDown={() => handlePointerDown(msg)} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
                    onClick={() => setLightbox(msg.content ?? null)}
                    className={`max-w-[72%] rounded-2xl overflow-hidden cursor-pointer ${isMe ? "rounded-br-sm" : "rounded-bl-sm"}`}>
                    <img src={msg.content} alt="photo" className="w-full max-h-72 object-cover" />
                  </motion.div>
                ) : isVideoMsg ? (
                  <div className={`max-w-[72%] rounded-2xl overflow-hidden ${isMe ? "rounded-br-sm" : "rounded-bl-sm"}`}>
                    <video src={msg.content} controls className="w-full max-h-72 object-cover" />
                  </div>
                ) : isAudioMsg ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    onPointerDown={() => handlePointerDown(msg)} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
                    className={`max-w-[80%] rounded-2xl px-3 py-2 flex items-center gap-3 ${isMe ? "bg-foreground text-background rounded-br-sm" : "bg-secondary rounded-bl-sm"}`}>
                    <Mic className="w-4 h-4 shrink-0" />
                    <audio src={msg.content} controls className="h-8 max-w-[180px]" />
                  </motion.div>
                ) : isDocMsg ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
                    onPointerDown={() => handlePointerDown(msg)} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
                    className={`max-w-[80%] rounded-2xl flex items-center gap-3 px-3 py-2.5 ${isMe ? "bg-foreground text-background rounded-br-sm" : "bg-secondary rounded-bl-sm"}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isMe ? "bg-background/20" : "bg-blue-600/15"}`}>
                      <FileText className={`w-4 h-4 ${isMe ? "text-background" : "text-blue-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold truncate">{decodeURIComponent(msg.content.split("/").pop() || "Document")}</p>
                      <p className={`text-[10px] ${isMe ? "text-background/60" : "text-muted-foreground"}`}>Document</p>
                    </div>
                    <a href={msg.content} download target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isMe ? "bg-background/20" : "bg-secondary"}`}>
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </motion.div>
                ) : (
                  <motion.div
                    onPointerDown={() => handlePointerDown(msg)} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
                    initial={{ opacity: 0, scale: 0.94, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    className={`max-w-[78%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed break-words ${
                      isMe ? "bg-foreground text-background rounded-br-sm"
                        : isHelpCenter ? "bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20 rounded-bl-sm"
                        : "bg-secondary rounded-bl-sm"
                    }`}>
                    {msg.content}
                  </motion.div>
                )}

                {/* Time + read receipt + reaction */}
                <div className={`flex items-center gap-1.5 ${isMe ? "flex-row-reverse" : ""} px-1`}>
                  {reaction && <span className="text-[14px]">{reaction}</span>}
                  <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                  {isMe && <CheckCheck className="w-3 h-3 text-muted-foreground" strokeWidth={2} />}
                </div>

                {/* Context menu */}
                <AnimatePresence>
                  {isContextOpen && (
                    <ContextMenu
                      isMe={isMe} content={msg.content ?? ""}
                      onReact={e => setReactions(r => ({ ...r, [msg.id]: e }))}
                      onReply={() => setReplyTo(msg)}
                      onCopy={() => navigator.clipboard?.writeText(msg.content ?? "")}
                      onForward={() => {}}
                      onDelete={() => setDeletedIds(s => new Set([...s, msg.id]))}
                      onClose={() => setContextMsg(null)}
                    />
                  )}
                </AnimatePresence>
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
          <div className="flex justify-end mb-1">
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
              <p className="text-[11px] text-muted-foreground mt-0.5">@{otherUsername} only accepts messages from friends.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="shrink-0 relative">

          {/* ── Emoji/GIF/Sticker picker ──────────────────────────────────────── */}
          <AnimatePresence>
            {showPicker && (
              <EmojiGifPicker
                onEmoji={e => { setInput(p => p + e); setShowPicker(false); }}
                onGif={url => { setShowPicker(false); setIsUploading(true); sendMessage(url, "image").finally(() => setIsUploading(false)); }}
                onSticker={url => { setShowPicker(false); sendMessage(url, "text"); }}
                onClose={() => setShowPicker(false)}
              />
            )}
          </AnimatePresence>

          {/* ── Attachment menu ──────────────────────────────────────────────── */}
          <AnimatePresence>
            {showAttach && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-10" onClick={() => setShowAttach(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="absolute left-2 bottom-full mb-2 z-20 bg-[#1c1c1e] rounded-2xl shadow-2xl overflow-hidden min-w-[200px] border border-white/5">
                  {ATTACH_ITEMS.map((item, i) => (
                    <motion.button key={item.key} whileTap={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                      onClick={() => handleAttach(item.key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${i < ATTACH_ITEMS.length - 1 ? "border-b border-white/5" : ""}`}>
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

          {/* ── Reply-to bar ─────────────────────────────────────────────────── */}
          <AnimatePresence>
            {replyTo && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="px-4 py-2 border-t border-secondary/40 flex items-center gap-2">
                <div className="flex-1 border-l-2 border-foreground pl-2">
                  <p className="text-[10px] font-semibold text-muted-foreground">{replyTo.sender_username || otherDisplayName}</p>
                  <p className="text-[12px] truncate">{replyTo.content}</p>
                </div>
                <button onClick={() => setReplyTo(null)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Recording UI ──────────────────────────────────────────────────── */}
          <AnimatePresence>
            {isRecording && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="px-3 pt-2 pb-2 flex items-center gap-3">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}
                  className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                <span className="text-[13px] font-semibold text-red-500">Recording {formatDuration(recordingDuration)}</span>
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
              <motion.button whileTap={{ scale: 0.88 }}
                onClick={() => { setShowAttach(v => !v); setShowPicker(false); }}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${showAttach ? "bg-foreground text-background rotate-45" : "bg-secondary"}`}>
                <AnimatePresence mode="wait" initial={false}>
                  {showAttach
                    ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X className="w-4 h-4" /></motion.span>
                    : <motion.span key="plus" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Plus className="w-4 h-4" /></motion.span>}
                </AnimatePresence>
              </motion.button>

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

              {input.trim() ? (
                <motion.button whileTap={{ scale: 0.85 }} onClick={handleSend} disabled={isSending}
                  className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center shrink-0 disabled:opacity-40">
                  {isSending ? <Loader2 className="w-4 h-4 text-background animate-spin" /> : <Send className="w-4 h-4 text-background" strokeWidth={2} />}
                </motion.button>
              ) : (
                <motion.button whileTap={{ scale: 0.88 }} onClick={startRecording}
                  className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <Mic className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Overlays ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {voiceCall && <VoiceCallOverlay name={otherDisplayName} avatar={otherAvatar} onClose={() => setVoiceCall(false)} conversationId={conversationId} myUsername={user?.username || ""} />}
      </AnimatePresence>
      <AnimatePresence>
        {videoCall && <VideoCallOverlay name={otherDisplayName} avatar={otherAvatar} tier={tier} onClose={() => setVideoCall(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showCamera && <CameraModal onClose={() => setShowCamera(false)} onCapture={handleCameraCapture} />}
      </AnimatePresence>
      <AnimatePresence>
        {mediaPreview && (
          <MediaPreview src={mediaPreview.src} isVideo={mediaPreview.isVideo}
            onSend={handleSendPreview} onClose={() => setMediaPreview(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      </AnimatePresence>
    </div>
  );
};

export default RealDmView;
