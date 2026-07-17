/**
 * RealDmView — full-screen chat interface for a real Supabase-backed DM conversation.
 * Used by ChatTab when the user opens a DM with a real account (including the Help Center / Whales bot).
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Send, Loader2, Lock, Smile } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { useAppContext } from "@/context/AppContext";
import { EmojiStickerPicker } from "@/components/EmojiStickerPicker";

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
  const { messages, loading, sendMessage, isOtherTyping } = useMessages(conversationId);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [blocked, setBlocked] = useState(isFriendsOnly || isBlockedProp || false);
  const [showPicker, setShowPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOtherTyping]);

  const avatarUrl = otherAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUsername}&backgroundColor=b6e3f4`;

  const handleSend = async () => {
    if (!input.trim() || isSending || blocked) return;
    const text = input.trim();
    setInput("");
    setIsSending(true);
    try {
      await sendMessage(text, "text");
    } catch (err: any) {
      if (err?.code === "FRIENDS_ONLY" || String(err).includes("403")) {
        setBlocked(true);
      }
      setInput(text); // restore on error
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="absolute inset-0 z-30 bg-background flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 pt-5 pb-3 border-b border-secondary/30">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onBack}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>
        <div className="relative shrink-0">
          {isHelpCenter ? (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-[16px]">
              🐋
            </div>
          ) : (
            <img src={avatarUrl} alt={otherDisplayName} className="w-9 h-9 rounded-full object-cover" />
          )}
          {isHelpCenter && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-background" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] truncate">
            {isHelpCenter ? "Help Center" : otherDisplayName}
          </p>
          {isHelpCenter && (
            <p className="text-[11px] text-muted-foreground">Always here to help · AI-powered</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-none px-4 py-4 space-y-2">
        {isHelpCenter && messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-10">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-3xl">
              🐋
            </div>
            <div>
              <p className="font-semibold text-[15px]">Reelsy Help Center</p>
              <p className="text-[13px] text-muted-foreground mt-1">Ask me anything about Reelsy —<br/>I'm powered by AI and always available.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 w-full">
              {["How do I post?", "Reset my password", "Change privacy settings", "Report a user"].map((q) => (
                <button key={q} onClick={() => setInput(q)}
                  className="px-3 py-2.5 bg-secondary rounded-2xl text-[12px] font-medium text-left hover:bg-secondary/80 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === userId || msg.sender_username === user?.username?.replace(/^@/, "");
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed ${
                isMe
                  ? "bg-foreground text-background rounded-br-sm"
                  : isHelpCenter
                    ? "bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20 rounded-bl-sm"
                    : "bg-secondary rounded-bl-sm"
              }`}>
                {msg.content}
              </div>
            </div>
          );
        })}

        {isOtherTyping && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl px-4 py-2.5 flex items-center gap-1">
              {[0, 0.15, 0.3].map((d) => (
                <motion.div key={d} className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                  animate={{ y: [-2, 2, -2] }} transition={{ duration: 0.8, repeat: Infinity, delay: d }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input / Blocked state */}
      {blocked ? (
        <div className="shrink-0 px-4 py-4 border-t border-secondary/30">
          <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl px-4 py-3">
            <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[13px] font-medium">You can't message this account</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                @{otherUsername} only accepts messages from friends. Send a friend request first.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="shrink-0 relative">
          {/* Emoji/sticker picker */}
          <AnimatePresence>
            {showPicker && (
              <EmojiStickerPicker
                onSelect={(content, type) => {
                  if (type === "sticker") {
                    // Send sticker as its own message immediately
                    setInput("");
                    setIsSending(true);
                    sendMessage(content, "text").finally(() => setIsSending(false));
                  } else {
                    setInput((prev) => prev + content);
                  }
                }}
                onClose={() => setShowPicker(false)}
              />
            )}
          </AnimatePresence>
          <div className="px-3 pt-2 pb-6 flex items-end gap-2">
            {/* Emoji button */}
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowPicker((v) => !v)}
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${showPicker ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}>
              <Smile className="w-4 h-4" />
            </motion.button>
            <div className="flex-1 flex items-end bg-secondary rounded-3xl px-3.5 py-2 min-h-[42px]">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                onFocus={() => setShowPicker(false)}
                placeholder={isHelpCenter ? "Ask Help Center anything…" : "Message…"}
                rows={1}
                style={{ fontSize: 15, resize: "none" }}
                className="flex-1 bg-transparent outline-none text-[14px] font-medium placeholder:text-muted-foreground/50 max-h-24 overflow-y-auto self-center"
              />
            </div>
            <motion.button whileTap={{ scale: 0.85 }} onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center shrink-0 disabled:opacity-40">
              {isSending ? <Loader2 className="w-4 h-4 text-background animate-spin" /> : <Send className="w-4 h-4 text-background" strokeWidth={2} />}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealDmView;
