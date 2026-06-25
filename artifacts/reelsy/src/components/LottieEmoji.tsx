import { useEffect, useRef, useState } from "react";

// Maps emoji characters to Google Noto Animated Emoji unicode codes
// Format: codepoint in hex (e.g. 1f602 for 😂)
const EMOJI_TO_UNICODE: Record<string, string> = {
  "😀": "1f600", "😃": "1f603", "😄": "1f604", "😁": "1f601", "😆": "1f606",
  "😅": "1f605", "🤣": "1f923", "😂": "1f602", "🙂": "1f642", "🙃": "1f643",
  "😉": "1f609", "😊": "1f60a", "😇": "1f607", "🥰": "1f970", "😍": "1f60d",
  "🤩": "1f929", "😘": "1f618", "😗": "1f617", "😚": "1f61a", "😙": "1f619",
  "🥲": "1f972", "😋": "1f60b", "😛": "1f61b", "😜": "1f61c", "🤪": "1f92a",
  "😝": "1f61d", "🤑": "1f911", "🤗": "1f917", "🤭": "1f92d", "🤫": "1f92b",
  "🤔": "1f914", "🤐": "1f910", "🤨": "1f928", "😐": "1f610", "😑": "1f611",
  "😶": "1f636", "😏": "1f60f", "😒": "1f612", "🙄": "1f644", "😬": "1f62c",
  "🤥": "1f925", "😌": "1f60c", "😔": "1f614", "😪": "1f62a", "🤤": "1f924",
  "😴": "1f634", "😷": "1f637", "🤒": "1f912", "🤕": "1f915", "🤢": "1f922",
  "🤮": "1f92e", "🤧": "1f927", "🥵": "1f975", "🥶": "1f976", "🥴": "1f974",
  "😵": "1f635", "🤯": "1f92f", "🤠": "1f920", "🥸": "1f978", "😎": "1f60e",
  "🧐": "1f9d0", "😕": "1f615", "😟": "1f61f", "🙁": "1f641", "☹️": "2639",
  "😮": "1f62e", "😯": "1f62f", "😲": "1f632", "😳": "1f633", "🥺": "1f97a",
  "😦": "1f626", "😧": "1f627", "😨": "1f628", "😰": "1f630", "😥": "1f625",
  "😢": "1f622", "😭": "1f62d", "😱": "1f631", "😖": "1f616", "😣": "1f623",
  "😞": "1f61e", "😓": "1f613", "😩": "1f629", "😫": "1f62b", "🥱": "1f971",
  "😤": "1f624", "😡": "1f621", "🤬": "1f92c", "😈": "1f608", "👿": "1f47f",
  "💀": "1f480", "☠️": "2620", "💩": "1f4a9", "🤡": "1f921", "👹": "1f479",
  "👺": "1f47a", "👻": "1f47b", "👽": "1f47d", "👾": "1f47e", "🤖": "1f916",
  "😸": "1f638", "😹": "1f639", "😺": "1f63a", "😻": "1f63b", "😼": "1f63c",
  "😽": "1f63d", "🙀": "1f640", "😿": "1f63f", "😾": "1f63e",
  "❤️": "2764", "🧡": "1f9e1", "💛": "1f49b", "💚": "1f49a", "💙": "1f499",
  "💜": "1f49c", "🖤": "1f5a4", "🤍": "1f90d", "🤎": "1f90e", "💔": "1f494",
  "❤️‍🔥": "2764-fe0f-200d-1f525", "💕": "1f495", "💞": "1f49e", "💓": "1f493",
  "💗": "1f497", "💖": "1f496", "💘": "1f498", "💝": "1f49d", "💟": "1f49f",
  "🔥": "1f525", "✨": "2728", "🎉": "1f389", "🎊": "1f38a", "🥳": "1f973",
  "👍": "1f44d", "👎": "1f44e", "👋": "1f44b", "🤚": "1f91a", "✋": "270b",
  "🤙": "1f919", "💪": "1f4aa", "🙏": "1f64f", "👏": "1f44f", "🤝": "1f91d",
  "👀": "1f440", "💯": "1f4af", "💥": "1f4a5", "💫": "1f4ab", "⭐": "2b50",
  "🌟": "1f31f", "✅": "2705", "❌": "274c", "🎵": "1f3b5", "🎶": "1f3b6",
};

function getEmojiUrl(emoji: string): string | null {
  const code = EMOJI_TO_UNICODE[emoji];
  if (!code) return null;
  return `https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/lottie.json`;
}

interface LottieEmojiProps {
  emoji: string;
  size?: number;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
}

// Simple Lottie player using the lottie-web approach via CDN data
export const LottieEmoji = ({ emoji, size = 24, className = "", loop = true, autoplay = true }: LottieEmojiProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const animRef = useRef<any>(null);

  const url = getEmojiUrl(emoji);

  useEffect(() => {
    if (!url || !containerRef.current) return;

    let cancelled = false;

    const loadAnimation = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load");
        const animationData = await res.json();

        if (cancelled || !containerRef.current) return;

        // Use lottie-web if available, otherwise fallback
        if ((window as any).lottie) {
          if (animRef.current) animRef.current.destroy();
          animRef.current = (window as any).lottie.loadAnimation({
            container: containerRef.current,
            renderer: "svg",
            loop,
            autoplay,
            animationData,
          });
          setLoaded(true);
        } else {
          // Dynamic import of lottie-web
          const lottie = await import("lottie-web");
          if (cancelled || !containerRef.current) return;
          if (animRef.current) animRef.current.destroy();
          animRef.current = lottie.default.loadAnimation({
            container: containerRef.current,
            renderer: "svg",
            loop,
            autoplay,
            animationData,
          });
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    loadAnimation();

    return () => {
      cancelled = true;
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, [url, loop, autoplay]);

  if (!url || failed) {
    // Fallback: render static emoji
    return (
      <span className={className} style={{ fontSize: size * 0.85, lineHeight: 1, display: "inline-block" }}>
        {emoji}
      </span>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title={emoji}
    />
  );
};

// Emoji picker component with animated emojis
export const CHAT_EMOJIS = [
  "😂", "😭", "❤️", "🔥", "👋", "👍", "👎", "🙏", "💀", "😍",
  "🥺", "😤", "😡", "🤣", "😅", "😢", "😊", "🤔", "🤯", "🥳",
  "😎", "🤩", "🥰", "😘", "😌", "😔", "🤝", "💪", "🎉", "✨",
  "💥", "👏", "🤦", "🙄", "😴", "🤤", "😋", "😜", "🤪", "🥴",
  "🤢", "🤮", "💩", "👻", "😸", "😹", "🙀", "💔", "💯", "❌",
  "✅", "🎵", "🎶", "😈", "🤡", "👾", "🤖", "💫", "⭐", "🌟",
  "😇", "🥲", "😶", "😬", "😷", "🤒", "🥵", "🥶", "😵", "🤠",
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
}

export const AnimatedEmojiPicker = ({ onSelect, onClose }: EmojiPickerProps) => {
  return (
    <div className="grid grid-cols-8 gap-1 p-2 max-h-48 overflow-y-auto">
      {CHAT_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => { onSelect(emoji); onClose?.(); }}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary active:scale-90 transition-all"
        >
          <LottieEmoji emoji={emoji} size={28} loop={false} />
        </button>
      ))}
    </div>
  );
};

export default LottieEmoji;
