import { LottieEmoji } from "./LottieEmoji";

/**
 * EmojiText — renders a string with every emoji replaced by an animated
 * LottieEmoji component.  Plain text segments stay as plain text.
 * Drop-in replacement anywhere you'd otherwise render a raw string.
 */

// Regex that matches a single emoji grapheme cluster (covers most emoji)
const EMOJI_REGEX =
  /(\p{Emoji_Presentation}|\p{Extended_Pictographic})(\uFE0F)?(\u20E3|\uFE0F|[\u{1F3FB}-\u{1F3FF}])?(\u200D(\p{Emoji_Presentation}|\p{Extended_Pictographic})(\uFE0F)?(\u20E3|[\u{1F3FB}-\u{1F3FF}])?)*/gu;

interface EmojiTextProps {
  text: string;
  emojiSize?: number;
  /** className applied to the wrapper span */
  className?: string;
  /** Extra class applied to each emoji wrapper */
  emojiClassName?: string;
}

export const EmojiText = ({
  text,
  emojiSize = 20,
  className = "",
  emojiClassName = "",
}: EmojiTextProps) => {
  if (!text) return null;

  const parts: { type: "text" | "emoji"; value: string }[] = [];
  let lastIndex = 0;
  const regex = new RegExp(EMOJI_REGEX.source, "gu");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "emoji", value: match[0] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-0.5 leading-snug ${className}`}>
      {parts.map((part, i) =>
        part.type === "text" ? (
          <span key={i}>{part.value}</span>
        ) : (
          <LottieEmoji
            key={i}
            emoji={part.value}
            size={emojiSize}
            loop={true}
            autoplay={true}
            className={emojiClassName}
          />
        )
      )}
    </span>
  );
};

export default EmojiText;
