import { useState, useRef, useEffect, useCallback, Fragment, useMemo } from "react";
import { useConversations } from "@/hooks/useMessages";
import { motion, AnimatePresence } from "framer-motion";
import meralogo from "@assets/mera.jpg";
import {
  ChevronLeft, Search, Edit3, X, Send, Mic, BadgeCheckIcon,
  Check, CheckCheck, Phone, Video, MoreHorizontal, Reply, Coffee, Globe,
  Copy, Trash2, Pencil, Users, Info, MessageSquare, Lock,
  Forward as ForwardIcon, Plus, Image, FileText, Gamepad2,
  PhoneCall, PhoneOff, VideoOff, MicOff, Crown, Volume2,
  ShoppingCart, Wifi, Battery, CreditCard, AlertCircle,
  Palette, BellOff, UserX, Flag, Eraser, AlertTriangle, ChevronRight,
  Bot, HelpCircle, Zap, LifeBuoy, Star, ChevronDown, Terminal, SmileIcon, Repeat2, Eye,
  Archive, Calendar, User, BarChart2, Headphones, ShoppingBag, Trophy, Lightbulb, Music, Leaf, EyeOff, Download, Camera, Share2, Loader2, ThumbsUp, ThumbsDown
} from "lucide-react";
import reelsyLogo from "@assets/j.png";
import botAvatar from "@assets/bot.jpg";
import {
  BOTS,
  BOT_FRIENDS_EVENT,
  BOT_FRIENDS_STORAGE_KEY,
  BOT_INTRO_MESSAGES,
  buildPollinationsTextUrl,
  getBotAvatarUrl,
  isAutonomousBotId,
  readFriendBotIds,
} from "@/data/bots";
import { useAppContext } from "@/context/AppContext";
import { useFeatureIntro } from "@/context/FeatureIntroContext";
import { hasSeenFeatureIntro, markFeatureIntroSeen } from "@/lib/featureIntro";
import { generateText } from "@/lib/ai";
import RealDmView from "@/components/RealDmView";
import UserProfile from "@/components/UserProfile";
import { NewChatSheet } from "@/components/NewChatSheet";
import { LottieEmoji } from "@/components/LottieEmoji";
import { EmojiText } from "@/components/EmojiText";


interface ChatTabProps { onNavVisible?: (v: boolean) => void; }

interface ChatMessage {
  id: number;
  fromId?: string;
  fromName: string;
  content: string;
  time: string;
  isMine: boolean;
  reaction?: string;
  replyTo?: { content: string; fromName: string };
  isDeleted?: boolean;
  isForwarded?: boolean;
  mediaType?: "image" | "file" | "audio" | "video" | "sticker" | "contact" | "poll" | "event" | "catalogue";
  mediaUrl?: string;
  viewOnce?: boolean;
  contactInfo?: { name: string; phone: string; avatar?: string };
  pollInfo?: { question: string; options: { id: string; text: string; votes: string[] }[] };
  eventInfo?: { title: string; date: string; time: string; location: string; rsvps: string[] };
  catalogueInfo?: { title: string; price: string; description: string; imageUrl: string };
  viewOnceOpened?: boolean;
  isSending?: boolean;
}

interface ChatThread {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  isGroup: boolean;
  members?: string[];
  isReelsy?: boolean;
  isSMS?: boolean;
  isReelsyBot?: boolean;
  isMeraAi?: boolean;
  isHelpCenter?: boolean;
  botId?: string;
  pinned?: boolean;
  isJoinable?: boolean;
}

const buildPollinationsImageUrl = (prompt: string) =>
  `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;

const MeraLogo = ({ className = "w-full h-full" }: { className?: string }) => (
<img
 src={meralogo}
          
        />
);

// ---- IMPROVED Animated emoji map ----
const SPECIAL_EMOJIS: Record<string, object> = {
  "😂": { y: [0, -16, 0, -10, 0, -5, 0], rotate: [-5, 5, -5, 5, 0], transition: { duration: 0.6, repeat: Infinity, repeatDelay: 0.5 } },
  "😭": { y: [0, 6, -2, 4, 0], scale: [1, 1.05, 0.97, 1.03, 1], transition: { duration: 0.9, repeat: Infinity, repeatDelay: 0.2 } },
  "❤️": { scale: [1, 1.35, 0.9, 1.25, 1], y: [0, -4, 0, -2, 0], transition: { duration: 0.65, repeat: Infinity, repeatDelay: 0.4 } },
  "❤️‍🔥": { scale: [1, 1.18, 0.88, 1.15, 1], rotate: [-6, 6, -6, 6, 0], transition: { duration: 0.4, repeat: Infinity } },
  "👋": { rotate: [0, -28, 24, -20, 18, -10, 0], transition: { duration: 0.7, repeat: Infinity, repeatDelay: 0.8 } },
  "🌚": { rotate: [0, 360], scale: [1, 1.05, 1], transition: { duration: 3, repeat: Infinity, ease: "linear" } },
  "😡": { x: [-7, 7, -7, 7, -4, 4, 0], scale: [1, 1.08, 1], transition: { duration: 0.35, repeat: Infinity, repeatDelay: 0.7 } },
  "😅": { rotate: [-9, 9, -9], y: [0, -5, 0], scale: [1, 1.06, 1], transition: { duration: 1.2, repeat: Infinity, repeatDelay: 0.5 } },
  "🙂": { scale: [1, 1.1, 1, 1.05, 1], transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" } },
  "😤": { y: [0, -9, 0], scale: [1, 1.12, 1], rotate: [-2, 2, -2, 0], transition: { duration: 0.6, repeat: Infinity, repeatDelay: 0.6 } },
  "🤧": { x: [0, -12, 12, -7, 0], rotate: [-5, 5, -5, 0], transition: { duration: 0.35, repeat: Infinity, repeatDelay: 2 } },
  "😉": { scaleX: [1, 0.9, 1], scaleY: [1, 0.94, 1], transition: { duration: 0.18, repeat: Infinity, repeatDelay: 2.5 } },
  "🥲": { x: [-3, 3, -3], y: [0, 3, 0], rotate: [-3, 3, -3], transition: { duration: 1.0, repeat: Infinity } },
  "🥺": { x: [-3, 3, -3], scale: [1, 0.94, 1], y: [0, 2, 0], transition: { duration: 0.6, repeat: Infinity } },
  "🔥": { scale: [1, 1.15, 0.92, 1.1, 1], rotate: [-4, 4, -4, 2, 0], transition: { duration: 0.5, repeat: Infinity, repeatDelay: 0.1 } },
  "💀": { rotate: [0, -8, 8, -6, 6, 0], y: [0, -3, 0], transition: { duration: 0.8, repeat: Infinity, repeatDelay: 1.2 } },
  "🎉": { scale: [1, 1.2, 0.9, 1.15, 1], rotate: [-8, 8, -8, 5, 0], transition: { duration: 0.5, repeat: Infinity, repeatDelay: 0.3 } },
  "💯": { scale: [1, 1.18, 0.95, 1.12, 1], y: [0, -6, 0], transition: { duration: 0.55, repeat: Infinity, repeatDelay: 0.4 } },
  "🤣": { rotate: [-15, 15, -15, 10, -10, 0], scale: [1, 1.1, 1], transition: { duration: 0.45, repeat: Infinity, repeatDelay: 0.3 } },
  "😍": { scale: [1, 1.12, 1], y: [0, -3, 0], transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" } },
  "🤔": { rotate: [-5, 5, -5], x: [-2, 2, -2], transition: { duration: 1.5, repeat: Infinity, repeatDelay: 0.8 } },
  "😎": { scale: [1, 1.05, 1], rotate: [-3, 3, -3, 0], transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } },
  "🙏": { y: [0, -5, 0, -3, 0], scale: [1, 1.08, 1], transition: { duration: 0.7, repeat: Infinity, repeatDelay: 0.5 } },
  "😈": { scale: [1, 1.08, 1], rotate: [-3, 3, -3, 0], transition: { duration: 1.8, repeat: Infinity } },
  "👏": { rotate: [0, 20, -20, 15, -10, 0], scale: [1, 1.1, 1], transition: { duration: 0.4, repeat: Infinity, repeatDelay: 0.3 } },
  "💪": { rotate: [-5, 5, -5], scale: [1, 1.12, 1], transition: { duration: 0.6, repeat: Infinity, repeatDelay: 0.8 } },
  "🌊": { x: [-4, 4, -4, 3, -3, 0], y: [0, -2, 0, 2, 0], transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" } },
  "⭐": { scale: [1, 1.2, 0.9, 1.15, 1], rotate: [0, 72, 144, 216, 288, 360], transition: { duration: 1.5, repeat: Infinity } },
};

// ── Message sounds (Messenger-style) ──────────────────────────────────────────
const playMsgSound = (type: 'send' | 'receive') => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    if (type === 'send') {
      osc.frequency.setValueAtTime(1046, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1318, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    } else {
      osc.frequency.setValueAtTime(698, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.11);
      gain2.gain.setValueAtTime(0.0001, ctx.currentTime + 0.11);
      gain2.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
      osc2.start(ctx.currentTime + 0.11);
      osc2.stop(ctx.currentTime + 0.32);
    }
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch {}
};

const AnimatedEmoji = ({ emoji, isMine }: { emoji: string; isMine: boolean }) => {
  const anim = SPECIAL_EMOJIS[emoji];
  return (
    <div className={`flex my-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
      <motion.span className="text-[56px] select-none block leading-none drop-shadow-md"
        animate={anim as any} initial={{}}>
        {emoji}
      </motion.span>
    </div>
  );
};

// ---- Reelsy official messages ----
const REELSY_MSGS: ChatMessage[] = [
  { id: 1, fromName: "Reelsy", content: "Welcome to Reelsy! Your new social home. Reelsy offers you a private end to end encrypted place for you, your friends and family. Our team desgined Reelsy with advanced privacy fetures, end to end encrytion and more.", time: "9:00 AM", isMine: false },
];

// ---- ReelsyBot V5 ----
const REELSY_BOT_MENU =
  `╭━━━〔 💵 ReelsyBot 𝐕5 〕━━━⬣\n` +
  `┃ ✦ Owner   : Reelsy\n` +
  `┃ ✦ Country : Nigeria\n` +
  `┃ ✦ Prefix  : [.]\n` +
  `┃ ✦ Mode    : Public\n` +
  `┃ ✦ Platform: Reelsy\n` +
  `┃ ✦ Speed   : 20ms\n` +
  `┃ ✦ Uptime  : 20days,40min,3sec\n` +
  `┃ ✦ Version : v5.10.1\n` +
  `┃ ✦ RAM     : 50%\n` +
  `┃ ✦ Usage   : 245GB\n` +
  `┃ ✦ AutoReply: off\n` +
  `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
  `«⚡ Developed By Reelsy-Team\n⚡ Powered By Cortex & Gpt AI»\n\n` +
  `╭━━━〔 👤 USER COMMANDS 〕━━━⬣\n` +
  `┃ ◇ .ping  ◇ .alive  ◇ .owner\n` +
  `┃ ◇ .stats ◇ .info   ◇ .time\n` +
  `┃ ◇ .runtime ◇ .uptime\n` +
  `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
  `╭━━━〔 🧠 AI COMMANDS 〕━━━⬣\n` +
  `┃ ◇ .cortex <q>  ◇ .roast <name>\n` +
  `┃ ◇ .weather <city> ◇ .imagine\n` +
  `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
  `╭━━━〔 🎭 FUN COMMANDS 〕━━━⬣\n` +
  `┃ ◇ .joke  ◇ .fact  ◇ .advice\n` +
  `┃ ◇ .8ball ◇ .coin  ◇ .dice\n` +
  `┃ ◇ .rps   ◇ .slot  ◇ .math\n` +
  `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
  `╭━━━〔 🛠️ UTILITY 〕━━━⬣\n` +
  `┃ ◇ .calculate <expr> ◇ .qr\n` +
  `┃ ◇ .encode ◇ .decode ◇ .tts\n` +
  `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
  `╭━━━〔 🚀 STATUS 〕━━━⬣\n` +
  `┃ ReelsyBot Online & Stable ✅\n` +
  `┃ AI Systems Operational ⚡\n` +
  `┃ Security Level : High 🔒\n` +
  `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
  `«💵 ReelsyBot V5 — Smart • Fast • Limitless»`;

const JOKES = [
  "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
  "I told my computer I needed a break. Now it won't stop sending me Kit-Kat ads. 🍫",
  "Why can't a nose be 12 inches long? Because then it would be a foot! 👃",
  "I asked the librarian if they had books about paranoia. She whispered: \"They're right behind you!\" 📚",
  "What do you call a fake noodle? An impasta! 🍝",
];
const FACTS = [
  "🧠 Fact: Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs that was still edible.",
  "🌊 Fact: The ocean produces 50-80% of Earth's oxygen. The sea is literally our lungs.",
  "🐙 Fact: Octopuses have three hearts, blue blood, and nine brains (one central + eight in each arm).",
  "⚡ Fact: A lightning bolt is 5x hotter than the surface of the sun.",
  "🌍 Fact: There are more trees on Earth than stars in the Milky Way galaxy.",
];
const ADVICE = [
  "💡 Drink water. The solution to most problems starts there.",
  "🌅 Start small. Momentum is more important than a perfect start.",
  "📵 Put the phone down and take a walk. Your brain will thank you.",
  "🤝 Be kind to people. You rarely know what they're going through.",
  "⏰ Sleep is a superpower. Don't trade it for doom-scrolling.",
];

const parseReelsyBotCommand = (text: string, tier: string): string | null => {
  const t = text.trim().toLowerCase();
  if (t === ".menu") return REELSY_BOT_MENU;
  if (t === ".ping") return "🏓 Pong! Response time: 20ms ⚡";
  if (t === ".alive") return "✅ ReelsyBot V5 is alive and fully operational!\n🔋 All systems running perfectly.";
  if (t === ".owner") return "👑 Owner: Reelsy\n📍 Country: Nigeria\n🌐 Platform: Reelsy";
  if (t === ".stats") return `📊 Bot Statistics:\n• Messages processed: ${(Math.floor(Math.random() * 50000) + 10000).toLocaleString()}\n• Uptime: 20 days, 40 min\n• RAM: 50%\n• Users: ${(Math.floor(Math.random() * 5000) + 1000).toLocaleString()}`;
  if (t === ".info") return `ℹ️ ReelsyBot V5\n• Version: v5.10.1\n• Prefix: [.]\n• Mode: Public\n• AI: Cortex + GPT\n• Platform: Reelsy`;
  if (t === ".time") return `🕐 Current time: ${new Date().toLocaleTimeString()}\n📅 Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;
  if (t === ".runtime" || t === ".uptime") return "⏱️ Bot uptime: 20 days, 40 minutes, 3 seconds\n🔋 Running continuously since last restart.";
  if (t === ".joke") return `😂 ${JOKES[Math.floor(Math.random() * JOKES.length)]}`;
  if (t === ".fact") return FACTS[Math.floor(Math.random() * FACTS.length)];
  if (t === ".advice") return `💭 ${ADVICE[Math.floor(Math.random() * ADVICE.length)]}`;
  if (t === ".coin") return `🪙 Coin flip: **${Math.random() > 0.5 ? "HEADS" : "TAILS"}**!`;
  if (t.startsWith(".dice")) {
    const sides = parseInt(t.split(" ")[1]) || 6;
    return `🎲 Rolling a ${sides}-sided die... Result: **${Math.floor(Math.random() * sides) + 1}**`;
  }
  if (t.startsWith(".rps")) {
    const choices = ["🪨 Rock", "📄 Paper", "✂️ Scissors"];
    const bot = choices[Math.floor(Math.random() * 3)];
    return `🎮 I chose: ${bot}! What did you pick?`;
  }
  if (t === ".slot") {
    const symbols = ["🍒", "🍋", "🍇", "⭐", "🔔", "💎"];
    const spin = [symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)]];
    const won = spin[0] === spin[1] && spin[1] === spin[2];
    return `🎰 ${spin.join(" | ")}\n${won ? "🎉 JACKPOT! You win!" : "😅 No luck this time. Try again!"}`;
  }
  if (t === ".math") {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    return `🧮 Math challenge: What is ${a} × ${b}?\n(Reply with your answer to see if you're right!)`;
  }
  if (t.startsWith(".calculate ") || t.startsWith(".calc ")) {
    const expr = t.replace(/^\.(calculate|calc) /, "").trim();
    try {
      // Safe math evaluation
      const sanitized = expr.replace(/[^0-9+\-*/().\s]/g, "");
      if (!sanitized) return "❌ Invalid expression. Use like: .calculate 2 + 2";
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${sanitized})`)();
      return `🧮 ${expr} = **${result}**`;
    } catch {
      return `❌ Could not calculate "${expr}". Try: .calculate 2 + 2`;
    }
  }
  if (t.startsWith(".roast ")) {
    const name = t.replace(".roast ", "").trim() || "you";
    const roasts = [`${name}, even WiFi has a stronger connection than you. 📶`, `${name} is so slow, they'd lose a race to a loading screen. 🐌`, `${name} studies for blood tests. 💉`];
    return `🔥 ${roasts[Math.floor(Math.random() * roasts.length)]}`;
  }
  if (t.startsWith(".weather ")) {
    const city = t.replace(".weather ", "").trim();
    const conditions = ["☀️ Sunny", "🌤️ Partly Cloudy", "🌧️ Rainy", "⛅ Overcast", "🌩️ Stormy"];
    const temp = Math.floor(Math.random() * 20) + 20;
    return `🌍 Weather for ${city}:\n${conditions[Math.floor(Math.random() * conditions.length)]}\n🌡️ ${temp}°C / ${Math.round(temp * 9/5 + 32)}°F\n💧 Humidity: ${Math.floor(Math.random() * 40) + 40}%`;
  }
  if (t.startsWith(".cortex ") || t.startsWith(".mera ")) {
    const q = t.replace(/^\.(cortex|mera) /, "");
    return `🤖 Cortex AI: Processing "${q}"...\n\n💡 That's a great question! Based on my analysis, the answer involves multiple factors. I'd recommend exploring this further through research and experimentation. The key is to stay curious! ✨`;
  }
  if (t === ".8ball" || t.startsWith(".8ball ")) {
    const answers = ["✅ Yes, definitely!", "❌ No, absolutely not.", "🤔 Maybe... The stars are unclear.", "💯 Without a doubt!", "😅 Ask again later.", "🎯 Signs point to yes!", "⚡ Don't count on it."];
    return `🎱 Magic 8-Ball says:\n"${answers[Math.floor(Math.random() * answers.length)]}"`;
  }
  if (t === ".imagine") return "🎨 Generating image...\n\n[Imagine feature requires Cortex AI - available for Premium+ users. Upgrade to unlock!]";
  if (t.startsWith(".encode ")) {
    const str = t.replace(".encode ", "");
    return `🔐 Encoded: ${btoa(str)}`;
  }
  if (t.startsWith(".decode ")) {
    try { return `🔓 Decoded: ${atob(t.replace(".decode ", ""))}`; }
    catch { return "❌ Invalid base64 string."; }
  }
  if (t.startsWith(".") && t.length > 1) {
    return `❓ Unknown command: "${text.split(" ")[0]}"\n\nSend .menu to see all available commands.`;
  }
  return null;
};

// ---- SMS thread messages ----


const SMS_RESPONSES: Record<string, string> = {
  balance: "📊 Your current data balance:\n• Main: 2.1GB remaining\n• Bonus: 500MB\n• Expires: May 17, 2026\n\nReply BUY to purchase more data.",
  buy: "🛍 Data Plans:\n1️⃣ 1GB - $1.99 (7 days)\n2️⃣ 5GB - $4.99 (30 days)\n3️⃣ 10GB - $8.99 (30 days)\n4️⃣ 20GB - $14.99 (30 days)\n\nReply the plan number to purchase.",
  "1": "✅ Processing your 1GB plan for $1.99...\nPayment successful! 1GB data added.\nNew balance: 3.1GB. Expires May 17, 2026.",
  "2": "✅ Processing your 5GB plan for $4.99...\nPayment successful! 5GB data added.\nNew balance: 7.1GB. Expires Jun 10, 2026.",
  "3": "✅ Processing your 10GB plan for $8.99...\nPayment successful! 10GB data added.\nNew balance: 12.1GB. Expires Jun 10, 2026.",
  "4": "✅ Processing your 20GB plan for $14.99...\nPayment successful! 20GB data added.\nNew balance: 22.1GB. Expires Jun 10, 2026.",
  help: "📱 Reelsy SMS Commands:\n• BALANCE - Check data balance\n• BUY - Purchase data plans\n• CODE - Request OTP\n• STATUS - Account status\n• HELP - Show this menu",
  code: "🔐 Your new OTP code: 739284\nValid for 5 minutes. Keep it private.",
  status: "✅ Account Status:\n• Number: Active\n• Plan: Premium\n• Messages sent: 47\n• Messages received: 123\n• Last active: Just now",
};

const getSMSResponse = (text: string): string | null => {
  const t = text.toLowerCase().trim();
  for (const [key, val] of Object.entries(SMS_RESPONSES)) {
    if (t === key || t.includes(key)) return val;
  }
  return "❓ Unknown command. Reply HELP to see available commands.";
};

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👏", "💯", "😍"];

const HUMAN_FALLBACK_REPLIES = [
  "I hear you. That actually makes sense. Tell me a bit more.",
  "Haha I get what you mean. I was thinking about something close to that today.",
  "That is interesting. I like the way you put it.",
  "For real, that kind of thing can change the whole mood.",
  "I am with you. What made you think about that?",
];

const getAutonomousBotReply = async (botName: string, personality: string, userText: string) => {
  const prompt = [
    `You are ${botName}, a real friendly Reelsy user.`,
    `Personality: ${personality}.`,
    "Reply casually like a human in one short message.",
    "Do not mention being AI, Pollinations, prompts, or automation.",
    "Keep it under 28 words.",
    `Message from friend: ${userText}`,
  ].join("\n");

  try {
    const response = await fetch(buildPollinationsTextUrl(prompt));
    const text = (await response.text()).trim().replace(/^["']|["']$/g, "");
    if (!response.ok || !text) throw new Error("Pollinations reply failed");
    return text.length > 220 ? text.slice(0, 217).trimEnd() + "..." : text;
  } catch {
    return HUMAN_FALLBACK_REPLIES[Math.floor(Math.random() * HUMAN_FALLBACK_REPLIES.length)];
  }
};

// ---- Group create screen ----
const GroupCreate = ({ onBack, onCreate }: { onBack: () => void; onCreate: (name: string, members: string[]) => void }) => {
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) => setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  return (
    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="absolute inset-0 bg-background flex flex-col z-30">
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onBack}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" />
        </motion.button>
        <p className="font-bold text-[15px]">New Chain</p>
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={() => selected.length > 0 && groupName.trim() && onCreate(groupName, selected)}
          disabled={selected.length === 0 || !groupName.trim()}
          className="px-3.5 py-1.5 rounded-full bg-foreground text-background text-[12px] font-bold disabled:opacity-40">
          Create
        </motion.button>
      </div>
      <div className="shrink-0 px-4 pb-3">
        <input value={groupName} onChange={(e) => setGroupName(e.target.value)}
          placeholder="Chain name" style={{ fontSize: 16 }}
          className="w-full h-[48px] px-4 bg-secondary rounded-xl font-medium outline-none" />
      </div>
      {selected.length > 0 && (
        <div className="shrink-0 flex gap-2 px-4 pb-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {selected.map((id) => {
            const bot = BOTS.find((b) => b.id === id);
            return bot ? (
              <motion.div key={id} initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-full bg-foreground text-background">
                <img src={getBotAvatarUrl(bot)} className="w-5 h-5 rounded-full object-cover" alt="" />
                <span className="text-[11px] font-semibold">{bot.name.split(" ")[0]}</span>
                <button onClick={() => toggle(id)}><X className="w-3 h-3" /></button>
              </motion.div>
            ) : null;
          })}
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-4">
        {BOTS.map((bot) => (
          <motion.button key={bot.id} whileTap={{ scale: 0.98 }} onClick={() => toggle(bot.id)}
            className="w-full flex items-center gap-3 py-3 text-left">
            <img src={getBotAvatarUrl(bot)} className="w-10 h-10 rounded-full bg-secondary object-cover shrink-0" alt="" />
            <div className="flex-1">
              <p className="font-semibold text-[13px]">{bot.name}</p>
              <p className="text-muted-foreground text-[11px]">{bot.role}</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selected.includes(bot.id) ? "bg-foreground border-foreground" : "border-secondary"}`}>
              {selected.includes(bot.id) && <Check className="w-3 h-3 text-background" strokeWidth={3} />}
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

// ---- Forward sheet ----
const ForwardSheet = ({ msg, threads, onForward, onClose }: {
  msg: ChatMessage; threads: ChatThread[]; onForward: (threadIds: string[]) => void; onClose: () => void;
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const toggle = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 5 ? [...prev, id] : prev);
  };
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 z-50" onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="absolute bottom-0 left-0 right-0 z-50 bg-background rounded-t-[28px] px-4 pt-4 pb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-bold text-[15px]">Forward to...</p>
            <p className="text-[11px] text-muted-foreground">{selected.length}/5 selected</p>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <X className="w-3.5 h-3.5" />
          </motion.button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-5" style={{ scrollbarWidth: "none" }}>
          {threads.filter((t) => !t.isReelsy).map((t) => {
            const bot = t.botId ? BOTS.find((b) => b.id === t.botId) : null;
            const isSelected = selected.includes(t.id);
            return (
              <motion.button key={t.id} whileTap={{ scale: 0.92 }}
                onClick={() => toggle(t.id)}
                className="flex flex-col items-center gap-1.5 shrink-0">
                <div className={`relative w-12 h-12 rounded-full overflow-hidden bg-secondary ${isSelected ? "ring-2 ring-foreground" : ""}`}>
                  {bot ? <img src={getBotAvatarUrl(bot)} className="w-full h-full object-cover" alt="" />
                    : t.isSMS ? <div className="w-full h-full bg-foreground/10 flex items-center justify-center"><MessageSquare className="w-5 h-5 text-foreground" /></div>
                      : <div className="w-full h-full flex items-center justify-center"><Users className="w-5 h-5 text-muted-foreground" /></div>
                  }
                  {isSelected && (
                    <div className="absolute inset-0 bg-foreground/80 flex items-center justify-center rounded-full">
                      <Check className="w-5 h-5 text-background" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium max-w-[52px] truncate text-center">{t.name.split(" ")[0]}</span>
              </motion.button>
            );
          })}
        </div>
        {sent ? (
          <div className="flex items-center justify-center gap-2 rounded-full bg-emerald-500 py-3 text-[13px] font-bold text-white">
            <Check className="h-4 w-4" /> Forwarded
          </div>
        ) : (
          <motion.button whileTap={{ scale: 0.97 }} disabled={selected.length === 0}
            onClick={() => { onForward(selected); setSent(true); setTimeout(onClose, 900); }}
            className="w-full rounded-full bg-foreground py-3.5 text-[13px] font-bold text-background disabled:opacity-40">
            Forward to {selected.length || 0}
          </motion.button>
        )}
      </motion.div>
    </>
  );
};

// ---- Voice Call Overlay ----
const VoiceCallOverlay = ({ thread, onClose }: { thread: ChatThread; onClose: () => void }) => {
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const bot = thread.botId ? BOTS.find((b) => b.id === thread.botId) : null;

  useEffect(() => {
    const t = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] flex flex-col items-center justify-between bg-gradient-to-b from-zinc-900 via-zinc-800 to-black pb-16 pt-20">
      <div className="flex flex-col items-center gap-4">
        <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2, repeat: Infinity }}
          className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-white/20 shadow-2xl">
          {bot ? (
            <img src={getBotAvatarUrl(bot)} alt={thread.name} className="w-full h-full object-cover" />
          ) : thread.isReelsy ? (
            <img src={reelsyLogo} alt="Reelsy" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
              <Users className="w-12 h-12 text-white/50" />
            </div>
          )}
        </motion.div>
        <div className="text-center">
          <p className="text-white text-[22px] font-bold">{thread.name}</p>
          <p className="text-white/60 text-[14px] mt-1">{fmt(duration)}</p>
        </div>


      </div>

      <div className="flex items-center gap-6">
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => setMuted(!muted)}
          className={`w-14 h-14 rounded-full flex items-center justify-center ${muted ? "bg-white text-black" : "bg-white/15 text-white"}`}>
          {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </motion.button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={onClose}
          className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
          <PhoneOff className="w-7 h-7 text-white" />
        </motion.button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => setSpeaker(!speaker)}
          className={`w-14 h-14 rounded-full flex items-center justify-center ${speaker ? "bg-white/15 text-white" : "bg-white text-black"}`}>
          <Volume2 className="w-6 h-6" />
        </motion.button>
      </div>
    </motion.div>
  );
};

// ---- Video Call Overlay ----
const VideoCallOverlay = ({ thread, tier, onClose }: { thread: ChatThread; tier: string; onClose: () => void }) => {
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const bot = thread.botId ? BOTS.find((b) => b.id === thread.botId) : null;

  useEffect(() => {
    const t = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (tier === "free") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 gap-5 px-8">
        <Crown className="w-12 h-12 text-amber-400" />
        <p className="text-white text-[20px] font-bold text-center">Premium Feature</p>
        <p className="text-white/60 text-[14px] text-center leading-relaxed">Video calls are available for Premium and Premium+ members.</p>
        <motion.button whileTap={{ scale: 0.95 }} onClick={onClose}
          className="px-8 py-3.5 rounded-full bg-white text-black font-bold text-[14px]">Got it</motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] bg-black flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        {bot ? (
          <img src={getBotAvatarUrl(bot)} alt={thread.name} className="w-full h-full object-cover opacity-70 scale-110" />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
            <Users className="w-20 h-20 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-5">
          <div>
            <p className="text-white font-bold text-[16px]">{thread.name}</p>
            <p className="text-white/60 text-[12px]">{fmt(duration)}</p>
          </div>
          <div className="w-24 h-32 rounded-2xl overflow-hidden bg-zinc-800 ring-2 ring-white/20 shadow-lg">
            {camOff ? (
              <div className="w-full h-full flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-white/30" />
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
                <Video className="w-8 h-8 text-white/30" />

              </div>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-center gap-5 pb-14 pt-4 bg-black">
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => setMuted(!muted)}
          className={`w-13 h-13 w-14 h-14 rounded-full flex items-center justify-center ${muted ? "bg-white text-black" : "bg-white/15 text-white"}`}>
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

// ---- Media Picker Sheet ----
// Emoji data with categories
const EMOJI_CATEGORIES = {
  smileys: { name: "Smileys", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙"] },
  hearts: { name: "Hearts", emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "💌", "💋"] },
  gesture: { name: "Hands", emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👍", "👎", "✊", "👊", "🤛", "🤜"] },
  celebration: { name: "Celebration", emojis: ["🎉", "🎊", "🎈", "🎀", "🎁", "🎗️", "🏆", "🥇", "🥈", "🥉", "⭐", "🌟", "✨", "⚡", "💥", "🔥", "💯", "💢", "💫", "🌠"] },
  animals: { name: "Animals", emojis: ["😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁"] },
  food: { name: "Food", emojis: ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥑", "🍅", "🍆", "🥒", "🥬"] },
  travel: { name: "Travel", emojis: ["✈️", "🚀", "🚁", "🚂", "🚃", "🚄", "🚅", "🚆", "🚇", "🚈", "🚉", "🚊", "🚝", "🚞", "🚋", "🚌", "🚍", "🚎", "🚐", "🚑"] },
  activity: { name: "Activity", emojis: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎳", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🥅", "⛳", "⛸️", "🎣"] },
  objects: { name: "Objects", emojis: ["💎", "💍", "👑", "🎒", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🔐", "🔑", "🔨", "⚒️", "🛠️", "⛏️", "🔧", "🔩", "⚙️", "🧱"] },
  nature: { name: "Nature", emojis: ["🌸", "🌼", "🌻", "🌞", "🌝", "🌛", "🌜", "🌚", "🌕", "🌖", "🌗", "🌘", "🌑", "⭐", "🌟", "💫", "✨", "⚡", "☄️", "💥"] },
};

// 50+ Sticker URLs (using popular sources)
const STICKER_CATEGORIES = {
  fun: {
    name: "Fun",
    stickers: [
      "https://media2.giphy.com/media/JIX9t2j0ZTN9S/200.gif",
      "https://media2.giphy.com/media/26BRsq6aK1YMRWBEY/200.gif",
      "https://media2.giphy.com/media/3oEjI6SIIHBdRxXI40/200.gif",
      "https://media2.giphy.com/media/ZqlnoxdnSFKOk/200.gif",
      "https://media2.giphy.com/media/7bnlL9h6Sn2kk/200.gif",
      "https://media2.giphy.com/media/xT9IgEx8SbX0teblYA/200.gif",
      "https://media2.giphy.com/media/l0MYEqEzw5aK9qvjG/200.gif",
      "https://media2.giphy.com/media/3NtY188QaxDdC/200.gif",
      "https://media2.giphy.com/media/3oz8xAFtqoOUUrsh7W/200.gif",
      "https://media2.giphy.com/media/tXL4FHPSnVJ0A/200.gif",
      "https://media2.giphy.com/media/l0HlNaQ6gWfllcjDO/200.gif",
      "https://media2.giphy.com/media/5GoVLqeAOo6PK/200.gif",
      "https://media2.giphy.com/media/blSTtZehjAZ8I/200.gif",
      "https://media2.giphy.com/media/3o7TKTDn976rzVgky4/200.gif",
      "https://media2.giphy.com/media/26BRBupa6nRXMGBO8/200.gif",
    ]
  },
  love: {
    name: "Love",
    stickers: [
      "https://media2.giphy.com/media/l3q2K5jinAlChoCLS/200.gif",
      "https://media2.giphy.com/media/5xtDarmwsuR9sDROiuY/200.gif",
      "https://media2.giphy.com/media/ICOgUNjpvO0PC/200.gif",
      "https://media2.giphy.com/media/WS6CDvv96vCDK/200.gif",
      "https://media2.giphy.com/media/hvdaGMfgbKLfk/200.gif",
      "https://media2.giphy.com/media/3o6ZtayqNLLr6rS9te/200.gif",
      "https://media2.giphy.com/media/3o6ZsYq8d0MRs2bkIU/200.gif",
      "https://media2.giphy.com/media/3oEdv4mFBkjQkFPXqo/200.gif",
      "https://media2.giphy.com/media/26FLgGTPUDH6UGAbm/200.gif",
      "https://media2.giphy.com/media/3o6ZsXwuGZLV4YUd3a/200.gif",
      "https://media2.giphy.com/media/l41YtBs6ql3SCFbHi/200.gif",
      "https://media2.giphy.com/media/26n6WywJyh39n1pBu/200.gif",
      "https://media2.giphy.com/media/26BRBDvn9p0jEkTkk/200.gif",
      "https://media2.giphy.com/media/3o6Zt0uVxRh6wSGM6Q/200.gif",
      "https://media2.giphy.com/media/3o6ZtpWv7U8Vjz3WIg/200.gif",
    ]
  },
  dance: {
    name: "Dance",
    stickers: [
      "https://media2.giphy.com/media/JIX9t2j0ZTN9S/200.gif",
      "https://media2.giphy.com/media/l0HlUpf8ggyuLvCzG/200.gif",
      "https://media2.giphy.com/media/3oEjI6SIIHBdRxXI40/200.gif",
      "https://media2.giphy.com/media/ZqlnoxdnSFKOk/200.gif",
      "https://media2.giphy.com/media/5C0a9LcGLcjSsytmRi/200.gif",
      "https://media2.giphy.com/media/l3q2K5jinAlChoCLS/200.gif",
      "https://media2.giphy.com/media/3oEduUQxFjJNAfcyha/200.gif",
      "https://media2.giphy.com/media/26BRv0ThflsHCqDrG/200.gif",
      "https://media2.giphy.com/media/3o6Zt0uVxRh6wSGM6Q/200.gif",
      "https://media2.giphy.com/media/3o6ZsOVoNa2eFV6BuU/200.gif",
      "https://media2.giphy.com/media/l0HlQY9x8v6j1nH6M/200.gif",
      "https://media2.giphy.com/media/3o6Ztj3pHYisKl0LS8/200.gif",
      "https://media2.giphy.com/media/3o6ZsXwuGZLV4YUd3a/200.gif",
      "https://media2.giphy.com/media/l0MYt0jWZQhB2IKOG/200.gif",
      "https://media2.giphy.com/media/3o6Zt6KCb64yjT51ia/200.gif",
    ]
  },
  animals: {
    name: "Animals",
    stickers: [
      "https://media.giphy.com/media/3o6ZsZI2cqSNmXOeYU/giphy.gif",
      "https://media.giphy.com/media/3o6ZsVmNMNO5tqcJ0c/giphy.gif",
      "https://media.giphy.com/media/l0HlY4bR01d07KOXe/giphy.gif",
      "https://media.giphy.com/media/l0HlQY9x8v6j1nH6M/giphy.gif",
      "https://media.giphy.com/media/3o6ZsOVoNa2eFV6BuU/giphy.gif",
      "https://media.giphy.com/media/l0HlWy9x8FZo0XO1i/giphy.gif",
      "https://media.giphy.com/media/l0MYt0jWZQhB2IKOG/giphy.gif",
      "https://media.giphy.com/media/3o6ZtayqNLLr6rS9te/giphy.gif",
      "https://media.giphy.com/media/l0HlG2MhFGcKwJnJS/giphy.gif",
      "https://media.giphy.com/media/5xtDarmwsuR9sDROiuY/giphy.gif",
      "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
      "https://media.giphy.com/media/l0HlOSPxJNIqJDgDm/giphy.gif",
      "https://media.giphy.com/media/3o6ZtpWv7U8Vjz3WIg/giphy.gif",
      "https://media.giphy.com/media/3o6ZsXwuGZLV4YUd3a/giphy.gif",
      "https://media.giphy.com/media/3o6ZsOVoNa2eFV6BuU/giphy.gif",
    ]
  },
  celebrate: {
    name: "Celebrate",
    stickers: [
      "https://media.giphy.com/media/3ohzdKdb7glasJmVb2/giphy.gif",
      "https://media.giphy.com/media/l0HlSsy9x8FZo0XO1i/giphy.gif",
      "https://media.giphy.com/media/3o6ZsYq8d0MRs2bkIU/giphy.gif",
      "https://media.giphy.com/media/l0HlWy9x8FZo0XO1i/giphy.gif",
      "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
      "https://media.giphy.com/media/l0HlOSPxJNIqJDgDm/giphy.gif",
      "https://media.giphy.com/media/3o6ZtpWv7U8Vjz3WIg/giphy.gif",
      "https://media.giphy.com/media/3o6ZsXwuGZLV4YUd3a/giphy.gif",
      "https://media.giphy.com/media/3o6ZsOVoNa2eFV6BuU/giphy.gif",
      "https://media.giphy.com/media/l0HlQY9x8v6j1nH6M/giphy.gif",
      "https://media.giphy.com/media/3o6Ztj3pHYisKl0LS8/giphy.gif",
      "https://media.giphy.com/media/3o6Zt0uVxRh6wSGM6Q/giphy.gif",
      "https://media.giphy.com/media/l0MYt0jWZQhB2IKOG/giphy.gif",
      "https://media.giphy.com/media/3o6Zt6KCb64yjT51ia/giphy.gif",
      "https://media.giphy.com/media/7bnlL9h6Sn2kk/giphy.gif",
    ]
  },
};

const MEDIA_ACTIONS = [
  { icon: SmileIcon, label: "Emoji", key: "emoji" },
  { icon: Repeat2, label: "Sticker", key: "sticker" },
  { icon: Image, label: "Photo", key: "photo" },
  { icon: Video, label: "Video", key: "video" },
  { icon: FileText, label: "Document", key: "document" },
];

// EMOJI DATA LIST
const EMOJI_LIST = [
  // Smileys & People
  { emoji: "😀", name: "happy smile grin grin", category: "smileys" },
  { emoji: "😃", name: "happy smile grin", category: "smileys" },
  { emoji: "😄", name: "happy smile grin", category: "smileys" },
  { emoji: "😁", name: "happy smile grin beam", category: "smileys" },
  { emoji: "😆", name: "happy smile laugh squint", category: "smileys" },
  { emoji: "😅", name: "happy sweat smile laugh", category: "smileys" },
  { emoji: "🤣", name: "rofl laughing floor", category: "smileys" },
  { emoji: "😂", name: "joy laugh cry tears", category: "smileys" },
  { emoji: "🙂", name: "smile slight", category: "smileys" },
  { emoji: "🙃", name: "upside down", category: "smileys" },
  { emoji: "😉", name: "wink blink", category: "smileys" },
  { emoji: "😊", name: "smile blush cheeks", category: "smileys" },
  { emoji: "😇", name: "angel halo innocent", category: "smileys" },
  { emoji: "🥰", name: "love hearts smiling", category: "smileys" },
  { emoji: "😍", name: "love heart eyes", category: "smileys" },
  { emoji: "🤩", name: "star struck eyes", category: "smileys" },
  { emoji: "😘", name: "kiss blow", category: "smileys" },
  { emoji: "😗", name: "kiss", category: "smileys" },
  { emoji: "😚", name: "kiss closed eyes", category: "smileys" },
  { emoji: "😙", name: "kiss smiling eyes", category: "smileys" },
  // Hearts
  { emoji: "❤️", name: "heart love red", category: "hearts" },
  { emoji: "🧡", name: "heart love orange", category: "hearts" },
  { emoji: "💛", name: "heart love yellow", category: "hearts" },
  { emoji: "💚", name: "heart love green", category: "hearts" },
  { emoji: "💙", name: "heart love blue", category: "hearts" },
  { emoji: "💜", name: "heart love purple", category: "hearts" },
  { emoji: "🖤", name: "heart love black", category: "hearts" },
  { emoji: "🤍", name: "heart love white", category: "hearts" },
  { emoji: "🤎", name: "heart love brown", category: "hearts" },
  { emoji: "💔", name: "heart broken sad", category: "hearts" },
  { emoji: "💕", name: "hearts love", category: "hearts" },
  // Gesture / Hands
  { emoji: "👋", name: "wave hello goodbye hi", category: "gesture" },
  { emoji: "🤚", name: "raised back hand", category: "gesture" },
  { emoji: "🖐️", name: "raised splayed hand fingers", category: "gesture" },
  { emoji: "✋", name: "raised stop hand", category: "gesture" },
  { emoji: "🖖", name: "vulcan salute spock", category: "gesture" },
  { emoji: "👌", name: "ok hand sign correct", category: "gesture" },
  { emoji: "🤌", name: "pinched fingers italian", category: "gesture" },
  { emoji: "👎", name: "thumbs down dislike", category: "gesture" },
  { emoji: "👍", name: "thumbs up like ok yes", category: "gesture" },
  { emoji: "✊", name: "fist raised power", category: "gesture" },
  // Celebration
  { emoji: "🎉", name: "party popper celebration congrats", category: "celebration" },
  { emoji: "🎊", name: "confetti ball party", category: "celebration" },
  { emoji: "🎈", name: "balloon party red", category: "celebration" },
  { emoji: "🎀", name: "ribbon bow pink", category: "celebration" },
  { emoji: "🎁", name: "gift present box wrapping", category: "celebration" },
  { emoji: "🏆", name: "trophy gold winner prize", category: "celebration" },
  { emoji: "⭐", name: "star gold yellow", category: "celebration" },
  { emoji: "🔥", name: "fire hot flame burn", category: "celebration" },
  { emoji: "💯", name: "hundred points perfect 100", category: "celebration" },
  // Animals
  { emoji: "😺", name: "cat happy smile face", category: "animals" },
  { emoji: "🐶", name: "dog puppy pet face", category: "animals" },
  { emoji: "🐱", name: "cat kitty face", category: "animals" },
  { emoji: "🐼", name: "panda bear face", category: "animals" },
  { emoji: "🐨", name: "koala bear face", category: "animals" },
  { emoji: "🦁", name: "lion wild cat face", category: "animals" },
  // Food
  { emoji: "🍏", name: "green apple fruit", category: "food" },
  { emoji: "🍎", name: "red apple fruit", category: "food" },
  { emoji: "🍊", name: "orange fruit tangerine", category: "food" },
  { emoji: "🍌", name: "banana fruit yellow", category: "food" },
  { emoji: "🍉", name: "watermelon fruit", category: "food" },
  { emoji: "🍒", name: "cherry cherries fruit red", category: "food" },
  { emoji: "🥑", name: "avocado fruit green", category: "food" },
  { emoji: "☕", name: "coffee cup tea hot drink", category: "food" },
  // Travel
  { emoji: "✈️", name: "airplane plane travel fly", category: "travel" },
  { emoji: "🚀", name: "rocket space launch ship", category: "travel" },
  { emoji: "🚗", name: "car auto drive red", category: "travel" },
  { emoji: "🌍", name: "globe earth world map", category: "travel" },
  // Activity
  { emoji: "⚽", name: "soccer football ball sport", category: "activity" },
  { emoji: "🏀", name: "basketball ball sport", category: "activity" },
  { emoji: "🎾", name: "tennis ball sport racket", category: "activity" },
  { emoji: "🎮", name: "game console controller pad video", category: "activity" },
  // Objects
  { emoji: "💡", name: "lightbulb idea light lamp", category: "objects" },
  { emoji: "💻", name: "laptop computer notebook pc screen", category: "objects" },
  { emoji: "🔒", name: "lock secure closed key padlock", category: "objects" },
  { emoji: "💎", name: "diamond gem jewelry stone blue", category: "objects" },
  // Symbols
  { emoji: "🎵", name: "music note song sound melody", category: "symbols" },
  { emoji: "🎶", name: "music notes song sound melody", category: "symbols" },
  { emoji: "❤️‍🔥", name: "heart fire flame burning love", category: "symbols" },
  // Flags
  { emoji: "🇳🇬", name: "nigeria flag green white", category: "flags" },
  { emoji: "🇺🇸", name: "united states flag usa America", category: "flags" },
  { emoji: "🇬🇧", name: "united kingdom flag uk britain", category: "flags" },
  { emoji: "🇨🇦", name: "canada flag maple leaf red", category: "flags" },
];

const EXTRA_EMOJI_LIST = [
  { emoji: "😀", name: "happy grin smile", category: "smileys" },
  { emoji: "😄", name: "happy laugh smile", category: "smileys" },
  { emoji: "😂", name: "joy laugh tears", category: "smileys" },
  { emoji: "🤣", name: "rolling laugh", category: "smileys" },
  { emoji: "😊", name: "smile blush", category: "smileys" },
  { emoji: "😍", name: "heart eyes love", category: "smileys" },
  { emoji: "🥰", name: "smiling hearts love", category: "smileys" },
  { emoji: "😭", name: "cry tears sad", category: "smileys" },
  { emoji: "🥺", name: "pleading cute", category: "smileys" },
  { emoji: "😎", name: "cool sunglasses", category: "smileys" },
  { emoji: "❤️", name: "heart red love", category: "hearts" },
  { emoji: "🧡", name: "heart orange love", category: "hearts" },
  { emoji: "💛", name: "heart yellow love", category: "hearts" },
  { emoji: "💚", name: "heart green love", category: "hearts" },
  { emoji: "💙", name: "heart blue love", category: "hearts" },
  { emoji: "💜", name: "heart purple love", category: "hearts" },
  { emoji: "🖤", name: "heart black love", category: "hearts" },
  { emoji: "🤍", name: "heart white love", category: "hearts" },
  { emoji: "💔", name: "broken heart sad", category: "hearts" },
  { emoji: "💕", name: "two hearts love", category: "hearts" },
  { emoji: "👋", name: "wave hello", category: "gesture" },
  { emoji: "👍", name: "thumbs up yes", category: "gesture" },
  { emoji: "👎", name: "thumbs down no", category: "gesture" },
  { emoji: "🙏", name: "pray thanks please", category: "gesture" },
  { emoji: "👏", name: "clap applause", category: "gesture" },
  { emoji: "🔥", name: "fire hot flame", category: "celebration" },
  { emoji: "✨", name: "sparkles shine", category: "celebration" },
  { emoji: "🎉", name: "party celebrate", category: "celebration" },
  { emoji: "💯", name: "hundred perfect", category: "celebration" },
  { emoji: "⭐", name: "star favorite", category: "celebration" },
  { emoji: "🐶", name: "dog pet", category: "animals" },
  { emoji: "🐱", name: "cat pet", category: "animals" },
  { emoji: "🦁", name: "lion animal", category: "animals" },
  { emoji: "🌸", name: "flower blossom", category: "animals" },
  { emoji: "🍕", name: "pizza food", category: "food" },
  { emoji: "🍔", name: "burger food", category: "food" },
  { emoji: "🍟", name: "fries food", category: "food" },
  { emoji: "🍰", name: "cake dessert", category: "food" },
  { emoji: "🚗", name: "car travel", category: "travel" },
  { emoji: "✈️", name: "plane travel", category: "travel" },
  { emoji: "🚀", name: "rocket space", category: "travel" },
  { emoji: "⚽", name: "football sport", category: "activity" },
  { emoji: "🏀", name: "basketball sport", category: "activity" },
  { emoji: "🎮", name: "game controller", category: "activity" },
  { emoji: "📱", name: "phone mobile", category: "objects" },
  { emoji: "💻", name: "laptop computer", category: "objects" },
  { emoji: "🔒", name: "lock secure", category: "objects" },
  { emoji: "🎵", name: "music note", category: "symbols" },
  { emoji: "✅", name: "check done", category: "symbols" },
  { emoji: "🇳🇬", name: "nigeria flag", category: "flags" },
  { emoji: "🇺🇸", name: "usa flag", category: "flags" },
];

const ALL_EMOJIS = [...EXTRA_EMOJI_LIST, ...EMOJI_LIST];

const MOCK_GIFS = [
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3VpdjB3bnJ6cG42ZndpOHdyZTBnbThnOWd6ZjE4NWltZXkycWhrNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/t3s3qLjpAgIauWToaa/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3dqN2ZlZXEzd3g0MmdhZGRsbnc3aTR5bDVqdTB2cHRrNXc0OHoxbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/2UIgpwSZp39549o6Je/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmtuazBzM3Q4bGFtOG1kMG9rb3p0a2t5dnh5a2lhMWRsc3A3cGM4YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/C21GGDOpKT6Z4Nu95j/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWNnMXB6c2NmMjRkNXFubDFydDR4eDZtM2M5YTZiY2tpeWd1azg1ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0MYEqEzw5aK9qvjG/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMnBkaXJ1Nm44aGs0bmQwdHhkOHhkNHVwcG4wdTBycHBpdzhscjhyNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3NtY188QaxDdC/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2FkMXZld3ZhbDltMTJ6Mm0zdXZxbTR1bzcycnRhcHRsdjNzdmptNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/tJqyalvo9ahykfykAj/giphy.gif",
  "https://media.giphy.com/media/CdfaW3hE90d6G63zKx/giphy.gif",
  "https://media.giphy.com/media/Zdg9HshX3GqQ0b7nLo/giphy.gif"
];

const AttachmentMenu = ({
  onClose,
  onItemClick,
}: {
  onClose: () => void;
  onItemClick: (key: string) => void;
}) => {
  const items = [
    { key: "document", label: "Document", color: "bg-purple-600", icon: FileText },
    { key: "photo_video", label: "Photos & videos", color: "bg-blue-500", icon: Image },
    { key: "camera", label: "Camera", color: "bg-emerald-500", icon: Camera },
    { key: "contact", label: "Friends", color: "bg-cyan-500", icon: User },
    { key: "event", label: "Event", color: "bg-rose-500", icon: Calendar },
    { key: "sticker", label: "Emojis & Stickers", color: "bg-teal-500", icon: SmileIcon },
    { key: "catalogue", label: "Catalogue", color: "bg-indigo-600", icon: ShoppingBag },
    { key: "quick", label: "Quick replies", color: "bg-yellow-500", icon: Zap },
  ];

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 15 }}
        transition={{ type: "spring", stiffness: 450, damping: 28 }}
        className="absolute bottom-16 left-3 z-40 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/80 rounded-[24px] py-3.5 px-2.5 w-[230px] shadow-2xl flex flex-col gap-1 select-none"
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.key}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                onItemClick(item.key);
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-900/60 active:bg-zinc-900 transition-colors text-left"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 ${item.color}`}>
                <Icon className="w-4 h-4" strokeWidth={2.2} />
              </div>
              <span className="text-[13px] font-semibold text-zinc-100">{item.label}</span>
            </motion.button>
          );
        })}
      </motion.div>
    </>
  );
};

const WhatsAppEmojiPicker = ({
  onClose,
  onSelectEmoji,
  onSelectSticker,
  onSelectGif,
}: {
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker: (url: string) => void;
  onSelectGif: (url: string) => void;
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"emoji" | "gif" | "sticker">("emoji");
  const [activeCategory, setActiveCategory] = useState<string>("smileys");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { id: "smileys", icon: SmileIcon, title: "Smileys & People" },
    { id: "hearts", icon: Star, title: "Hearts" },
    { id: "gesture", icon: Users, title: "Hands" },
    { id: "celebration", icon: Trophy, title: "Celebration" },
    { id: "animals", icon: Leaf, title: "Animals & Nature" },
    { id: "food", icon: Coffee, title: "Food & Drink" },
    { id: "travel", icon: Globe, title: "Travel & Places" },
    { id: "activity", icon: Trophy, title: "Activity" },
    { id: "objects", icon: Lightbulb, title: "Objects" },
    { id: "symbols", icon: Music, title: "Symbols" },
    { id: "flags", icon: Flag, title: "Flags" },
  ];

  const filteredEmojis = ALL_EMOJIS.filter((item) => {
    const matchesSearch = searchQuery
      ? item.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesCategory = searchQuery ? true : item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", stiffness: 450, damping: 28 }}
        className="absolute bottom-16 right-3 z-40 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/80 rounded-[24px] w-[335px] h-[390px] shadow-2xl flex flex-col overflow-hidden text-foreground select-none"
      >
        <div className="shrink-0 p-3 pb-2 border-b border-zinc-800/60 bg-zinc-950/40">
          {activeSubTab === "emoji" && !searchQuery && (
            <div className="flex items-center justify-between gap-1 mb-2.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    title={cat.title}
                    className={`p-1.5 rounded-lg transition-all shrink-0 ${
                      isSelected
                        ? "bg-foreground text-background scale-110 font-bold"
                        : "text-muted-foreground hover:bg-zinc-800/60 hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeSubTab === "emoji"
                  ? "Search emoji"
                  : activeSubTab === "gif"
                  ? "Search GIF"
                  : "Search sticker"
              }
              className="w-full bg-zinc-900 border border-zinc-800/60 rounded-xl pl-9 pr-3 py-1.5 outline-none text-[13px] placeholder:text-muted-foreground/60 focus:border-zinc-700/80 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 overscroll-none scrollbar-thin">
          {activeSubTab === "emoji" && (
            <div>
              {searchQuery ? (
                <div className="grid grid-cols-7 gap-1">
                  {filteredEmojis.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectEmoji(item.emoji)}
                      className="w-full aspect-square flex items-center justify-center rounded-lg hover:bg-zinc-800/50 active:scale-90 transition-all"
                    >
                      <LottieEmoji emoji={item.emoji} size={26} loop={false} />
                    </button>
                  ))}
                  {filteredEmojis.length === 0 && (
                    <p className="col-span-7 text-center py-8 text-[11px] text-muted-foreground">
                      No emojis found
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">
                    {categories.find((c) => c.id === activeCategory)?.title}
                  </p>
                  <div className="grid grid-cols-7 gap-1">
                    {filteredEmojis.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSelectEmoji(item.emoji)}
                        className="w-full aspect-square flex items-center justify-center rounded-lg hover:bg-zinc-800/50 active:scale-90 transition-all"
                      >
                        <LottieEmoji emoji={item.emoji} size={26} loop={false} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSubTab === "sticker" && (
            <div className="space-y-4">
              {Object.entries(STICKER_CATEGORIES).map(([key, category]) => {
                const matchesSearch = searchQuery
                  ? category.name.toLowerCase().includes(searchQuery.toLowerCase())
                  : true;
                if (!matchesSearch) return null;
                return (
                  <div key={key}>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      {category.name} Stickers
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {category.stickers.map((url, idx) => (
                        <button
                          key={`${key}-${idx}`}
                          onClick={() => onSelectSticker(url)}
                          className="w-full aspect-square rounded-xl overflow-hidden bg-zinc-900/50 hover:bg-zinc-800/40 hover:scale-[1.03] transition-all border border-zinc-900"
                        >
                          <img src={url} alt="sticker" className="w-full h-full object-contain p-1" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeSubTab === "gif" && (
            <div className="grid grid-cols-2 gap-2">
              {MOCK_GIFS.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectGif(url)}
                  className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-zinc-900 hover:scale-[1.02] active:scale-95 transition-all border border-zinc-900"
                >
                  <img src={url} alt="gif" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 h-[48px] bg-zinc-950 border-t border-zinc-900 flex items-center justify-around px-4">
          <button
            onClick={() => {
              setActiveSubTab("emoji");
              setSearchQuery("");
            }}
            className={`flex flex-col items-center justify-center gap-0.5 w-12 h-full border-t-2 transition-all ${
              activeSubTab === "emoji"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <SmileIcon className="w-4 h-4" />
            <span className="text-[9px] font-bold">Emoji</span>
          </button>
          <button
            onClick={() => {
              setActiveSubTab("gif");
              setSearchQuery("");
            }}
            className={`flex flex-col items-center justify-center gap-0.5 w-12 h-full border-t-2 transition-all ${
              activeSubTab === "gif"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-tight leading-none">GIF</span>
            <span className="text-[9px] font-bold">GIFs</span>
          </button>
          <button
            onClick={() => {
              setActiveSubTab("sticker");
              setSearchQuery("");
            }}
            className={`flex flex-col items-center justify-center gap-0.5 w-12 h-full border-t-2 transition-all ${
              activeSubTab === "sticker"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Repeat2 className="w-4 h-4" />
            <span className="text-[9px] font-bold">Stickers</span>
          </button>
        </div>
      </motion.div>
    </>
  );
};

const CameraCaptureModal = ({
  onClose,
  onCapture,
}: {
  onClose: () => void;
  onCapture: (preview: string, type: "photo" | "video") => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didLongPressRef = useRef(false);
  const [hasStream, setHasStream] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  useEffect(() => {
    let cancelled = false;
    setHasStream(false);
    setErrorMsg("");
    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera API is not available.");
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: true });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
        }
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          setHasStream(true);
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setErrorMsg("Webcam access not supported or denied.");
      }
    };
    startCamera();

    return () => {
      cancelled = true;
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        onCapture(dataUrl, "photo");
      }
    }
  };

  const stopRecording = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined" || isRecordingVideo) return;
    didLongPressRef.current = true;
    chunksRef.current = [];
    if (typeof MediaRecorder === "undefined") {
      capture();
      return;
    }
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      setIsRecordingVideo(false);
      setRecordSeconds(0);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      onCapture(url, "video");
    };
    recorder.start();
    setIsRecordingVideo(true);
    setRecordSeconds(0);
    recordTimerRef.current = setInterval(() => {
      setRecordSeconds((seconds) => {
        if (seconds >= 14) {
          stopRecording();
          return seconds;
        }
        return seconds + 1;
      });
    }, 1000);
  };

  const handleShutterDown = () => {
    didLongPressRef.current = false;
    holdTimerRef.current = setTimeout(startRecording, 380);
  };

  const handleShutterUp = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (isRecordingVideo || didLongPressRef.current) {
      stopRecording();
      return;
    }
    capture();
  };

  const useMock = () => {
    const randomSeed = Math.floor(Math.random() * 10000);
    const mockUrl = `https://image.pollinations.ai/prompt/premium%20social%20reelsy%20camera%20selfie%20shot,aesthetic?width=600&height=600&seed=${randomSeed}&nologo=true`;
    onCapture(mockUrl, "photo");
  };

  return (
    <div className="absolute inset-0 bg-black z-[60] flex flex-col items-center justify-between p-5 text-white">
      <div className="w-full flex items-center justify-between">
        <span className="text-[14px] font-bold">Reelsy Camera</span>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="w-full flex-1 my-4 rounded-[32px] overflow-hidden bg-zinc-950 border border-white/10 flex items-center justify-center relative">
        {errorMsg ? (
          <div className="text-center px-6">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-[12px] text-white/80">{errorMsg}</p>
            <button onClick={useMock} className="mt-4 px-4 py-2 bg-white text-black font-bold text-[11px] rounded-full">
              AI Snap
            </button>
          </div>
        ) : !hasStream ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-[11px] text-white/50">Starting camera...</p>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        )}
        {isRecordingVideo && (
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span className="text-[11px] font-bold">REC {String(recordSeconds).padStart(2, "0")}s</span>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="w-full flex items-center justify-between px-4 pb-3">
        <button
          onClick={() => setFacingMode((mode) => mode === "user" ? "environment" : "user")}
          disabled={isRecordingVideo}
          className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold disabled:opacity-40"
        >
          Flip
        </button>
        {hasStream && (
          <button
            onPointerDown={handleShutterDown}
            onPointerUp={handleShutterUp}
            onPointerLeave={() => isRecordingVideo && stopRecording()}
            className={`w-20 h-20 rounded-full border-4 flex items-center justify-center p-1 bg-transparent active:scale-95 transition-all ${
              isRecordingVideo ? "border-red-500" : "border-white"
            }`}
          >
            <div className={`w-full h-full rounded-full transition-all ${isRecordingVideo ? "bg-red-500 scale-75" : "bg-white"}`} />
          </button>
        )}
        <button onClick={useMock} disabled={isRecordingVideo} className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center text-[0px] font-black disabled:opacity-40 overflow-hidden">
          <span className="text-[10px]">AI</span>
          🎭 AI Snap
        </button>
      </div>
      <p className="pb-1 text-[11px] text-white/55">Tap for photo. Hold to record video.</p>
    </div>
  );
};


// 1. Poll Creator Modal
const PollCreatorModal = ({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (question: string, options: string[]) => void;
}) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const addOption = () => {
    if (options.length < 5) setOptions([...options, ""]);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const handleOptionChange = (val: string, idx: number) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const submit = () => {
    const filled = options.map((o) => o.trim()).filter(Boolean);
    if (question.trim() && filled.length >= 2) {
      onCreate(question.trim(), filled);
    }
  };

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 w-full max-w-sm flex flex-col gap-4 text-left shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-bold text-white flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-amber-500" /> Create Poll
          </span>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Question</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-3 py-2 outline-none text-[13px] text-white"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Options</label>
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={opt}
                onChange={(e) => handleOptionChange(e.target.value, idx)}
                placeholder={`Option ${idx + 1}`}
                className="flex-1 bg-zinc-900 border border-zinc-850 rounded-xl px-3 py-2 outline-none text-[13px] text-white"
              />
              {options.length > 2 && (
                <button onClick={() => removeOption(idx)} className="text-zinc-500 hover:text-rose-500 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {options.length < 5 && (
            <button onClick={addOption} className="text-[11px] font-bold text-amber-500 hover:underline">
              + Add Option
            </button>
          )}
        </div>

        <button
          onClick={submit}
          disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
          className="w-full py-3 bg-amber-500 disabled:opacity-40 text-black font-bold text-[13px] rounded-xl transition-all"
        >
          Create Poll
        </button>
      </motion.div>
    </div>
  );
};

// 2. Event Creator Modal
const EventCreatorModal = ({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (title: string, date: string, time: string, location: string) => void;
}) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

  const submit = () => {
    if (title.trim() && date.trim() && location.trim()) {
      onCreate(title.trim(), date.trim(), time.trim() || "Anytime", location.trim());
    }
  };

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 w-full max-w-sm flex flex-col gap-4 text-left shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-bold text-white flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-rose-500" /> Create Event
          </span>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Event Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Reelsy Meetup"
              className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-3 py-2 outline-none text-[13px] text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Date</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="e.g. June 15"
                className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-3 py-2 outline-none text-[13px] text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Time</label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="e.g. 6:00 PM"
                className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-3 py-2 outline-none text-[13px] text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Eko Beach"
              className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-3 py-2 outline-none text-[13px] text-white"
            />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!title.trim() || !date.trim() || !location.trim()}
          className="w-full py-3 bg-rose-500 disabled:opacity-40 text-white font-bold text-[13px] rounded-xl transition-all"
        >
          Create Event
        </button>
      </motion.div>
    </div>
  );
};

// 3. Contact Selector Modal
const ContactSelectorModal = ({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (name: string, phone: string) => void;
}) => {
  const contacts = [
    { name: "Sarah Chen", phone: "@Chen" },
    { name: "David Kim", phone: "@dragon-keeper" },
    { name: "Sophia Rodriguez", phone: "@sophia" },
    { name: "Alex Mwangi", phone: "@alex" },
    { name: "John Doe", phone: "@john345" },
     { name: "~ User not found", phone: "@~ User not found" },
  ];

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-950  rounded-3xl p-5 w-full max-w-sm flex flex-col gap-4 text-left shadow-2xl max-h-[80%]"
      >
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-bold text-white flex items-center gap-1.5">
            <User className="w-4 h-4 text-cyan-500" /> Share Friends ID
          </span>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-1 pr-1">
          {contacts.map((c, i) => (
            <button
              key={i}
              onClick={() => onSelect(c.name, c.phone)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-900 text-left transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500 font-bold text-[14px]">
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">{c.name}</p>
                <p className="text-[10px] text-zinc-500 truncate">{c.phone}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// 4. Catalogue Selector Modal
const CatalogueSelectorModal = ({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (product: { title: string; price: string; description: string; imageUrl: string }) => void;
}) => {
  const products = [
    {
      title: "Reelsy Premium Hoodie",
      price: "$39.99",
      description: "Ultra-soft cotton hoodie with custom embroidered Reelsy logo.",
      imageUrl: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&auto=format&fit=crop",
    },
    {
      title: "Gold Badge Lifetime Membership",
      price: "$99.99",
      description: "Get lifetime access to all Reelsy premium and gold features.",
      imageUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&auto=format&fit=crop",
    },
    {
      title: "Cortex AI Pro Package",
      price: "$14.99/mo",
      description: "Supercharge your interactions with Cortex powered by GPT-4o.",
      imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop",
    },
  ];

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 w-full max-w-sm flex flex-col gap-4 text-left shadow-2xl max-h-[85%]"
      >
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-bold text-white flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-indigo-500" /> Reelsy Store Catalogue
          </span>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-3 pr-1">
          {products.map((p, i) => (
            <button
              key={i}
              onClick={() => onSelect(p)}
              className="w-full flex gap-3 p-2 rounded-xl hover:bg-zinc-900 text-left transition-colors border border-zinc-900 hover:border-zinc-800"
            >
              <img src={p.imageUrl} alt={p.title} className="w-14 h-14 rounded-lg object-cover bg-zinc-900 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-white truncate">{p.title}</p>
                <p className="text-[10px] text-indigo-400 font-bold mb-0.5">{p.price}</p>
                <p className="text-[9px] text-zinc-400 line-clamp-2">{p.description}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// 5. Quick Replies Overlay
const QuickRepliesMenu = ({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (text: string) => void;
}) => {
  const templates = [
    "On my way! 🏃",
    "I'll call you right back.",
    "Sounds perfect! Let's do it. 👍",
    "Send me the details.",
    "Reelsy is awesome! ❤️",
    "Can you call me?",
    "Goodbye, talk later.",
  ];

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", stiffness: 450, damping: 28 }}
        className="absolute bottom-16 left-3 z-40 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/80 rounded-[20px] p-2.5 w-[200px] shadow-2xl flex flex-col gap-0.5 select-none"
      >
        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-2 py-1 border-b border-zinc-900 mb-1">
          Quick Replies
        </p>
        {templates.map((t, idx) => (
          <button
            key={idx}
            onClick={() => {
              onSelect(t);
              onClose();
            }}
            className="w-full px-2 py-2 rounded-lg hover:bg-zinc-900 text-left text-[12px] font-semibold text-zinc-200 transition-colors"
          >
            {t}
          </button>
        ))}
      </motion.div>
    </>
  );
};


// Media Editor Component for multiple image/video items
const MediaEditor = ({ mediaList, setMediaList, tier, onSend, onClose, requestFeatureIntro }: {
  mediaList: { type: string; preview: string; file?: File; caption?: string; viewOnce?: boolean }[];
  setMediaList: React.Dispatch<React.SetStateAction<{ type: string; preview: string; file?: File; caption?: string; viewOnce?: boolean }[]>>;
  tier: string;
  onSend: (items: { type: string; preview: string; file?: File; caption?: string; viewOnce?: boolean }[]) => void;
  onClose: () => void;
  requestFeatureIntro: (key: string, title: string, description: string, action: () => void) => void;
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const canUseViewOnce = tier === "premium+" || tier === "premium" || tier === "gold";

  // Safeguard active index
  const safeIndex = Math.min(activeIndex, mediaList.length - 1);
  const currentItem = mediaList[safeIndex];

  if (!currentItem) {
    onClose();
    return null;
  }

  const isVideo = currentItem.type === "video";
  const caption = currentItem.caption || "";
  const viewOnce = currentItem.viewOnce || false;

  const setCaptionForCurrent = (val: string) => {
    setMediaList((prev) =>
      prev.map((item, idx) => (idx === safeIndex ? { ...item, caption: val } : item))
    );
  };

  const setViewOnceForCurrent = (val: boolean) => {
    setMediaList((prev) =>
      prev.map((item, idx) => (idx === safeIndex ? { ...item, viewOnce: val } : item))
    );
  };

  const removeItem = (idxToRemove: number) => {
    setMediaList((prev) => {
      const updated = prev.filter((_, idx) => idx !== idxToRemove);
      if (updated.length === 0) {
        onClose();
      } else {
        if (activeIndex >= updated.length) {
          setActiveIndex(updated.length - 1);
        }
      }
      return updated;
    });
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black z-50" onClick={onClose} />
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="absolute inset-0 z-50 bg-black text-white overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
          <p className="font-bold text-[14px]">Preview & Share</p>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/12 flex items-center justify-center">
            <X className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        {/* Preview */}
        <div className="flex-1 flex items-center justify-center overflow-hidden p-4 relative">
          <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full text-[11px] font-semibold text-white/90 z-10">
            {safeIndex + 1} of {mediaList.length}
          </div>

          {currentItem.preview && isVideo ? (
            <video key={currentItem.preview} src={currentItem.preview} controls className="max-w-full max-h-full object-contain" />
          ) : currentItem.preview && (
            <img key={currentItem.preview} src={currentItem.preview} alt="preview" className="max-w-full max-h-full object-contain" />
          )}
        </div>

        {/* Thumbnails Row */}
        {mediaList.length > 1 && (
          <div className="shrink-0 px-4 py-2 bg-black/40 overflow-x-auto border-t border-white/5 flex gap-2 justify-center">
            {mediaList.map((item, idx) => {
              const isActive = idx === safeIndex;
              return (
                <div
                  key={idx}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 cursor-pointer transition-all ${
                    isActive ? "border-white scale-105" : "border-transparent opacity-60 hover:opacity-90"
                  }`}
                  onClick={() => setActiveIndex(idx)}
                >
                  {item.type === "video" ? (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center relative">
                      <video src={item.preview} className="w-full h-full object-cover pointer-events-none" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <img src={item.preview} className="w-full h-full object-cover" alt="thumb" />
                  )}
                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(idx);
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold hover:bg-red-500 shadow-md"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Caption & Options */}
        <div className="shrink-0 px-4 py-4 space-y-3 bg-black/92 border-t border-white/10">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Add Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaptionForCurrent(e.target.value)}
              placeholder={`Add a message to your ${isVideo ? "video" : "photo"}...`}
              rows={2}
              className="w-full bg-white/10 rounded-2xl px-4 py-3 outline-none text-[13px] placeholder:text-white/45 resize-none"
            />
          </div>

          {/* View Once Feature */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (canUseViewOnce) {
                requestFeatureIntro(
                  "chat_view_once",
                  "View Once",
                  "Send messages that can only be viewed once. Perfect for private moments.",
                  () => setViewOnceForCurrent(!viewOnce)
                );
              } else {
                setShowUpgradePrompt(true);
              }
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
              viewOnce
                ? "bg-violet-500/25 border border-violet-400/50"
                : "bg-white/10 hover:bg-white/15"
            }`}>
            <div className="flex items-center gap-3">
              <Eye className={`w-4 h-4 ${viewOnce ? "text-violet-300" : "text-white/60"}`} />
              <div className="text-left">
                <p className="text-[13px] font-semibold">View Once</p>
                <p className="text-[10px] text-white/55">User can only view once</p>
              </div>
            </div>
            {viewOnce && <Check className="w-4 h-4 text-violet-500" />}
            {!canUseViewOnce && <Crown className="w-3.5 h-3.5 text-amber-400" />}
          </motion.button>

          {!canUseViewOnce && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <p className="text-[11px] text-amber-700 font-medium">View Once is a Premium+ feature</p>
            </div>
          )}

          {/* Send Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              onSend(mediaList);
              onClose();
            }}
            className="w-full py-3.5 rounded-full bg-white text-black font-bold text-[13px] hover:shadow-lg transition-shadow flex items-center justify-center gap-2">
            <Send className="w-4 h-4" />
            Send {mediaList.length} {mediaList.length === 1 ? (isVideo ? "Video" : "Photo") : "Items"}
          </motion.button>
        </div>

        {/* Premium Upgrade Modal Popup */}
        <AnimatePresence>
          {showUpgradePrompt && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm text-center shadow-2xl"
              >
                <Crown className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h3 className="text-white text-[16px] font-bold mb-2">Premium+ Feature</h3>
                <p className="text-[12px] text-zinc-400 leading-relaxed mb-5">
                  View Once is gated for Premium+ & Gold tiers. Upgrade today to send photos and videos that vanish after being opened.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowUpgradePrompt(false)}
                    className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-white font-bold text-[12px] rounded-xl transition-all"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => {
                      setShowUpgradePrompt(false);
                      onClose();
                    }}
                    className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-[12px] rounded-xl transition-all"
                  >
                    Upgrade Now
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

const TypingIndicator = ({ name }: { name: string }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
    className="flex items-center gap-2 px-2">
    <div className="flex items-center gap-1.5 px-4 py-3 bg-secondary rounded-2xl rounded-bl-sm min-w-[56px]">
      {[0, 0.22, 0.44].map((d, i) => (
        <motion.div key={i}
          animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: d, ease: "easeInOut" }}
          className="w-2 h-2 rounded-full bg-muted-foreground" />
      ))}
    </div>
  </motion.div>
);

// ---- Render post content with # and @ highlighting ----
const renderContent = (text: string) => {
  // Split on @mentions and #hashtags, render emojis as Lottie animations
  const parts = text.split(/([@#]\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@") || part.startsWith("#")) {
      return (
        <span key={i} className="text-blue-500 font-semibold">{part}</span>
      );
    }
    // Use EmojiText to animate any emojis in plain text segments
    return <EmojiText key={i} text={part} emojiSize={18} />;
  });
};

// ---- Wallpaper options ----
// values can be: "" (default), a solid color, "image:<url>", or "video:<dataUrl>"
const WALLPAPERS = [
  { id: "default", label: "Default", value: "" },
  { id: "mist", label: "Mist", value: "#eef6ff" },
  { id: "unsplash-1", label: "Sunset", value: "image:https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&auto=format&fit=crop" },
  { id: "unsplash-2", label: "Mountains", value: "image:https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&auto=format&fit=crop" },
  { id: "unsplash-3", label: "Lake", value: "image:https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&auto=format&fit=crop" },
  { id: "unsplash-4", label: "City", value: "image:https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200&auto=format&fit=crop" },
  { id: "unsplash-5", label: "Beach", value: "image:https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop" },
  { id: "unsplash-6", label: "Aurora", value: "image:https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=1200&auto=format&fit=crop" },
];

// ---- Wallpaper Picker ----
const WallpaperPicker = ({ current, tier, onSelect, onClose }: {
  current: string; tier: string; onSelect: (v: string) => void; onClose: () => void;
}) => {
  const canUseVideo = tier === "premium+" || tier === "gold";
  const imageRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLInputElement | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      onSelect(`image:${event.target?.result as string}`);
      onClose();
    };
    reader.readAsDataURL(f);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (video.duration > 20) {
        alert("Video wallpapers must be 20 seconds or less.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        onSelect(`video:${event.target?.result as string}`);
        onClose();
      };
      reader.readAsDataURL(f);
    };
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 z-50" onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="absolute bottom-0 left-0 right-0 z-50 bg-background rounded-t-[28px] px-5 pt-4 pb-10">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-[15px]">Chat Wallpaper</p>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <X className="w-3.5 h-3.5" />
          </motion.button>
        </div>
        {!canUseVideo && (
          <div className="flex items-center gap-2.5 mb-4 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <Crown className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-[12px] font-medium text-amber-600">Short video wallpapers are available for Premium+ members.</p>
          </div>
        )}
        <div className="grid grid-cols-4 gap-2.5">
          {WALLPAPERS.map((w) => {
            const isImage = w.value.startsWith("image:");
            const bgStyle: any = isImage ? { backgroundImage: `url(${w.value.slice(6)})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: w.value || "hsl(var(--secondary))" };
            return (
              <motion.button key={w.id} whileTap={{ scale: 0.9 }}
                onClick={() => { onSelect(w.value); onClose(); }}
                className="relative flex flex-col items-center gap-1">
                <div className={`w-full aspect-square rounded-2xl border-2 transition-all ${current === w.value ? "border-foreground" : "border-transparent"}`}
                  style={bgStyle} />
                <span className="text-[10px] font-medium text-muted-foreground">{w.label}</span>
                {current === w.value && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-foreground flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-background" strokeWidth={3} />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
          <button onClick={() => imageRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 text-[12px] font-semibold">
            <Image className="w-4 h-4" />
            Image
          </button>
          <button onClick={() => videoRef.current?.click()}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-semibold ${canUseVideo ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}
            disabled={!canUseVideo}>
            {canUseVideo ? <Video className="w-4 h-4" /> : <Crown className="w-4 h-4 text-amber-500" />}
            20s Video
          </button>
        </div>
      </motion.div>
    </>
  );
};

// ---- Report Dialog ----
const REPORT_REASONS = ["Spam or advertising", "Harassment or bullying", "Inappropriate content", "Fake account", "Violence or harmful content", "Other"];

const ReportDialog = ({ name, onClose }: { name: string; onClose: () => void }) => {
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);

  const submit = () => {
    if (!reason) return;
    setDone(true);
    setTimeout(onClose, 1600);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 z-50" onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="absolute bottom-0 left-0 right-0 z-50 bg-background rounded-t-[28px] px-5 pt-4 pb-10">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-[15px]">Report {name}</p>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <X className="w-3.5 h-3.5" />
          </motion.button>
        </div>
        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-2 py-5 text-[14px] font-bold text-emerald-500">
            <Check className="w-5 h-5" strokeWidth={2.5} /> Report submitted. Thank you.
          </motion.div>
        ) : (
          <>
            <p className="text-[12px] text-muted-foreground mb-3">Why are you reporting this account?</p>
            <div className="space-y-1.5 mb-4">
              {REPORT_REASONS.map((r) => (
                <button key={r} onClick={() => setReason(r)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left text-[13px] font-medium transition-all ${reason === r ? "bg-foreground text-background" : "bg-secondary"}`}>
                  {r}
                  {reason === r && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                </button>
              ))}
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={submit} disabled={!reason}
              className="w-full py-3.5 rounded-full bg-rose-500 text-white font-bold text-[14px] disabled:opacity-40">
              Submit Report
            </motion.button>
          </>
        )}
      </motion.div>
    </>
  );
};

// ---- Block Confirmation ----
const BlockConfirm = ({ name, onBlock, onClose }: { name: string; onBlock: () => void; onClose: () => void }) => (
  <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />
    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 450, damping: 28 }}
      className="absolute bottom-12 left-4 right-4 z-50 bg-background rounded-3xl overflow-hidden shadow-2xl">
      <div className="px-5 py-5 text-center border-b border-secondary/40">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-3">
          <UserX className="w-6 h-6 text-rose-500" />
        </div>
        <p className="font-bold text-[15px] mb-1">Block {name}?</p>
        <p className="text-[12px] text-muted-foreground leading-relaxed">They won't be able to message you or see your posts.</p>
      </div>
      <button onClick={onBlock} className="w-full py-4 text-[14px] font-semibold text-rose-500 border-b border-secondary/40">Block</button>
      <button onClick={onClose} className="w-full py-4 text-[14px] font-semibold">Cancel</button>
    </motion.div>
  </>
);

// ---- Main ChatTab ----
const ChatTab = ({ onNavVisible }: ChatTabProps) => {
  const { reelsyNumber, tier, t, ip, user: me, pendingDmUser, setPendingDmUser } = useAppContext();
  const { requestFeatureIntro } = useFeatureIntro();

  // ── Real DM conversations (Supabase-backed) ──
  const { conversations: dmConversations } = useConversations();

  const [friendBotIds, setFriendBotIds] = useState<string[]>(readFriendBotIds);

  const buildInitialThreads = (): ChatThread[] => {
    const base: ChatThread[] = [
      { id: "reelsy-official", name: "Reelsy", lastMessage: "Welcome to Reelsy! 🎉", time: "now", unread: 1, isGroup: false, isReelsy: true, pinned: true },
      { id: "help-center", name: "Help Center", lastMessage: "Ask me anything about Reelsy 🐋", time: "now", unread: 1, isGroup: false, isHelpCenter: true, pinned: true },
      { id: "mera-ai", name: "Kabil", lastMessage: "Hi, my name is kabil am reelsy built in ai assistant ready to assist you.", time: "now", unread: 1, isGroup: false, isMeraAi: true, pinned: true },
       
    ];
    if (reelsyNumber) {
      base.splice(1, 0, { id: "sms", name: "SMS", lastMessage: "Your Reelsy number is active.", time: "now", unread: 1, isGroup: false, isSMS: true, pinned: true });
    }
    return base;
  };

  const [threads, setThreads] = useState<ChatThread[]>(buildInitialThreads);
  const [activeId, setActiveId] = useState<string | null>(null);

  // ── Real DM conversation overlay (Supabase-backed) ──
  const [activeDmConv, setActiveDmConv] = useState<{
    id: string;
    otherUsername: string;
    otherDisplayName: string;
    otherAvatar?: string;
    isHelpCenter?: boolean;
  } | null>(null);

  // Hide bottom navigator whenever a real DM conversation is open
  useEffect(() => {
    onNavVisible?.(!activeDmConv);
  }, [activeDmConv, onNavVisible]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(() => {
    const now = Date.now();
    const D = 24 * 60 * 60 * 1000; // one day in ms
    const fmt = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return {
      "mock-group-1": [
        // ---- 2 days ago ----
        { id: now - 2 * D - 10 * 3600000, fromName: "System", content: "Creators Chain 🎬 was created", time: fmt(now - 2 * D - 10 * 3600000), isMine: false },
        { id: now - 2 * D - 9.5 * 3600000, fromName: "Kabil", content: "Hey team! 👋 We need to start planning the full Reelsy launch strategy.", time: fmt(now - 2 * D - 9.5 * 3600000), isMine: false },
        { id: now - 2 * D - 9 * 3600000, fromName: "Sarah", content: "I'm so excited for this 🎉 I've been working on some high-contrast visual filters for our Reels.", time: fmt(now - 2 * D - 9 * 3600000), isMine: false },
        { id: now - 2 * D - 8.5 * 3600000, fromName: "Micheal", content: "Great! I've also been optimizing the backend — response times are down to 40ms. 🚀 Nothing will stop us.", time: fmt(now - 2 * D - 8.5 * 3600000), isMine: false },
        { id: now - 2 * D - 8 * 3600000, fromName: "Jacob", content: "Love it. Let's set a date. How about we soft-launch end of the week?", time: fmt(now - 2 * D - 8 * 3600000), isMine: false },
        { id: now - 2 * D - 7.5 * 3600000, fromName: "Kabil", content: "End of week works for me. I'll draft a content calendar and share it here.", time: fmt(now - 2 * D - 7.5 * 3600000), isMine: false },
        // ---- Yesterday ----
        { id: now - D - 11 * 3600000, fromName: "Kabil", content: "📅 Sharing the content calendar draft — we have 12 posts planned for launch week, 2 per day.", time: fmt(now - D - 11 * 3600000), isMine: false },
        { id: now - D - 10.5 * 3600000, fromName: "Sarah", content: "This looks amazing Kabil! I finished the 5 visual filter assets. They're fire 🔥 ready to export.", time: fmt(now - D - 10.5 * 3600000), isMine: false },
        { id: now - D - 10 * 3600000, fromName: "Micheal", content: "Backend is fully deployed to staging. Load tests pass at 10k concurrent users. We're good 💪", time: fmt(now - D - 10 * 3600000), isMine: false },
        { id: now - D - 9.5 * 3600000, fromName: "Jacob", content: "Hashtag research done — I found 8 trending tags that match our niche perfectly. Will paste them in.", time: fmt(now - D - 9.5 * 3600000), isMine: false },
        { id: now - D - 9 * 3600000, fromName: "Jacob", content: "#ReelsyLaunch #CreatorFirst #SocialReinvented #MakeItReal #ReelsyApp #NextGenSocial #BuildInPublic #Creators2024", time: fmt(now - D - 9 * 3600000), isMine: false },
        { id: now - D - 8.5 * 3600000, fromName: "Kabil", content: "Perfect. Sarah please export the filters as PNGs and share them in the group.", time: fmt(now - D - 8.5 * 3600000), isMine: false },
        // ---- Today (unread — these 5 will trigger the Reelsy AI box) ----
        { id: now - 4.2 * 3600000, fromName: "Sarah", content: "✅ Done! All 5 filters exported and ready. Uploading to the shared drive now.", time: fmt(now - 4.2 * 3600000), isMine: false },
        { id: now - 3.8 * 3600000, fromName: "Micheal", content: "Prod environment is fully green 🟢 I just ran the final deployment pipeline — all checks passed!", time: fmt(now - 3.8 * 3600000), isMine: false },
        { id: now - 3.2 * 3600000, fromName: "Jacob", content: "The landing page copy is polished. SEO meta tags are set and we're indexed on Google already 🤯", time: fmt(now - 3.2 * 3600000), isMine: false },
        { id: now - 2.5 * 3600000, fromName: "Kabil", content: "This is unreal guys. We are so ready. Let's launch TONIGHT at 9pm! 🚀🎬", time: fmt(now - 2.5 * 3600000), isMine: false },
        { id: now - 25 * 60000, fromName: "Sarah", content: "Let's launch this tonight! Who's ready? 🔥🔥🔥", time: fmt(now - 25 * 60000), isMine: false },
      ]
    };
  });
  const [openedWithUnread, setOpenedWithUnread] = useState<number>(0);
  const [metaAiSummary, setMetaAiSummary] = useState<string | null>(null);
  const [isMetaAiLoading, setIsMetaAiLoading] = useState(false);
  const [showMetaAiBox, setShowMetaAiBox] = useState(true);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showGroupCreate, setShowGroupCreate] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showThreadMore, setShowThreadMore] = useState(false);
  const [contextMsg, setContextMsg] = useState<ChatMessage | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [forwardMsg, setForwardMsg] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [voiceCall, setVoiceCall] = useState(false);
  const [videoCall, setVideoCall] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [wallpapers, setWallpapers] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("reelsy_thread_wallpapers");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [mutedIds, setMutedIds] = useState<string[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [mediaListToEdit, setMediaListToEdit] = useState<{ type: string; preview: string; file?: File; caption?: string; viewOnce?: boolean }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const threadLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressThreadClick = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showEventCreator, setShowEventCreator] = useState(false);
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [showCatalogueSelector, setShowCatalogueSelector] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [profileInfoBot, setProfileInfoBot] = useState<any>(null);
  const [chatNotice, setChatNotice] = useState("");
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceStartedAtRef = useRef(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [showLightboxMenu, setShowLightboxMenu] = useState(false);
  const [viewOnceMedia, setViewOnceMedia] = useState<ChatMessage | null>(null);

  const activeThread = threads.find((t) => t.id === activeId);
  const activeMessages = messages[activeId || ""] || [];

  const closeViewOnceMedia = () => {
    if (viewOnceMedia && activeId) {
      setMessages((p) => ({
        ...p,
        [activeId]: (p[activeId] || []).map((m) => m.id === viewOnceMedia.id ? { ...m, viewOnceOpened: true } : m),
      }));
    }
    setViewOnceMedia(null);
  };

  useEffect(() => {
    setMessages((prev) => {
      const init: Record<string, ChatMessage[]> = {};
      BOTS.forEach((b) => {
        const botMsgs = BOT_INTRO_MESSAGES.filter((m) => m.botId === b.id).map((m) => m.text);
        const acceptedMessage: ChatMessage[] = friendBotIds.includes(b.id)
          ? [{
            id: 0, fromId: b.id, fromName: b.name,
            content: `${b.name} accepted your friend request. You can message them anytime.`,
            time: "now", isMine: false,
          }]
          : [];
        init[b.id] = [
          ...acceptedMessage,
          ...botMsgs.map((m, i) => ({
            id: i + 1, fromId: b.id, fromName: b.name, content: m,
            time: `${9 + Math.floor(i / 2)}:${String((i * 7) % 60).padStart(2, "0")} AM`, isMine: false,
          })),
        ];
      });
      init["reelsy-official"] = [...REELSY_MSGS];
      init["help-center"] = [
        {
          id: 1,
          fromName: "Help Center",
          content: "Hey! 🐋 I'm the Reelsy Help Center. Ask me anything — account setup, privacy, posts, messages, friend requests, notifications, or anything else about the app!",
          time: "now",
          isMine: false,
        },
      ];
      init["mera-ai"] = [
        {
          id: 1,
          fromName: "Kabil",
          content: "Hi, my name is kabil am reelsy built in ai assistant ready to assist you.",
          time: "now",
          isMine: false,
        },
      ];
      init["reelsy-bot"] = [
        { id: 1, fromName: "ReelsyBot", content: "👋 Hey! I'm ReelsyBot V5 — your AI-powered assistant.\n\nSend .menu to see all my commands. I can tell jokes, give advice, do math, check weather, and more! ⚡", time: "9:00 AM", isMine: false },
      ];
      if (reelsyNumber) init["sms"] = [];
      // Preserve mock group messages — do NOT overwrite them
      return { ...init, "mock-group-1": prev["mock-group-1"] || [] };
    });
  }, [reelsyNumber]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeMessages, isTyping]);

  useEffect(() => {
    localStorage.setItem("reelsy_thread_wallpapers", JSON.stringify(wallpapers));
  }, [wallpapers]);

  useEffect(() => {
    const syncFriends = () => setFriendBotIds(readFriendBotIds());
    const onStorage = (e: StorageEvent) => {
      if (e.key === BOT_FRIENDS_STORAGE_KEY) syncFriends();
    };

    window.addEventListener(BOT_FRIENDS_EVENT, syncFriends);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(BOT_FRIENDS_EVENT, syncFriends);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (friendBotIds.length === 0) return;

    setThreads((prev) => prev.map((thread) => {
      if (!thread.botId || !friendBotIds.includes(thread.botId)) return thread;
      const bot = BOTS.find((b) => b.id === thread.botId);
      if (!bot) return thread;
      return {
        ...thread,
        lastMessage: thread.lastMessage.includes("accepted your friend request")
          ? thread.lastMessage
          : `${bot.name} accepted your friend request. Say hi!`,
        time: "now",
        unread: Math.max(thread.unread, 1),
        pinned: true,
      };
    }));

    setMessages((prev) => {
      let changed = false;
      const next = { ...prev };
      friendBotIds.forEach((id) => {
        const bot = BOTS.find((b) => b.id === id);
        if (!bot) return;
        const existing = next[id] || [];
        if (existing.some((message) => message.content.includes("accepted your friend request"))) return;
        changed = true;
        next[id] = [
          {
            id: Date.now() + existing.length,
            fromId: id,
            fromName: bot.name,
            content: `${bot.name} accepted your friend request. You can message them anytime.`,
            time: "now",
            isMine: false,
          },
          ...existing,
        ];
      });
      return changed ? next : prev;
    });
  }, [friendBotIds]);

  useEffect(() => {
    const pendingThread = localStorage.getItem("reelsy_active_thread_id");
    if (!pendingThread || activeId || !threads.some((t) => t.id === pendingThread)) return;
    localStorage.removeItem("reelsy_active_thread_id");
    setActiveId(pendingThread);
    onNavVisible?.(false);
    setThreads((p) => p.map((t) => t.id === pendingThread ? { ...t, unread: 0 } : t));
  }, [activeId, threads, onNavVisible]);

  const activeWallpaper = activeId ? wallpapers[activeId] || "" : "";
  const activeWallpaperIsVideo = activeWallpaper.startsWith("video:");
  const activeWallpaperStyle = activeWallpaper && !activeWallpaperIsVideo
    ? activeWallpaper.startsWith("image:")
      ? {
        backgroundImage: `linear-gradient(hsl(var(--background) / 0.18), hsl(var(--background) / 0.18)), url(${activeWallpaper.slice(6)})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
      : { background: activeWallpaper }
    : undefined;

  const openThread = (id: string) => {
    const thread = threads.find((t) => t.id === id);
    setOpenedWithUnread(thread ? thread.unread : 0);
    setMetaAiSummary(null);
    setIsMetaAiLoading(false);
    setShowMetaAiBox(true);
    setActiveId(id);
    onNavVisible?.(false);
    setThreads((p) => p.map((t) => t.id === id ? { ...t, unread: 0 } : t));

    // History entry so phone back button returns to chat list UI
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "chat");
      url.searchParams.set("thread", id);
      window.history.pushState({ tab: "chat", threadId: id }, "", url);
      localStorage.setItem("reelsy_active_thread_id", id);
    } catch {}
  };


  const closeThread = () => {
    setOpenedWithUnread(0);
    setMetaAiSummary(null);
    setShowMetaAiBox(false);
    setActiveId(null);

    // On mobile, ensure navigator bar becomes visible again.
    // Also keep chat tab showing the thread list.
    onNavVisible?.(true);

    // Close thread: go back within chat (avoid breaking mobile nav stack)
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "chat");
      url.searchParams.delete("thread");

      // Prefer replaceState so we don't create an extra history step.
      window.history.replaceState({ tab: "chat", threadId: null }, "", url);
      localStorage.removeItem("reelsy_active_thread_id");
    } catch {}

    setReplyTo(null);



    setEditingId(null);
    setContextMsg(null);
    setInput("");
    setVoiceCall(false);
    setVideoCall(false);
    setShowChatMenu(false);
    setShowWallpaperPicker(false);
    setShowReport(false);
    setShowBlockConfirm(false);
  };

  const handleMetaAiSummarize = async () => {
    if (!activeId) return;
    setIsMetaAiLoading(true);
    setMetaAiSummary(null);
    try {
      const activeMsgs = messages[activeId] || [];
      const count = openedWithUnread || 5;
      const unreadList = activeMsgs.filter(m => m.fromName !== "System" && !m.isMine).slice(-count);

      if (unreadList.length === 0) {
        setMetaAiSummary("No unread messages to summarize.");
        setIsMetaAiLoading(false);
        return;
      }

      const msgsText = unreadList
        .map(m => `${m.fromName} (${m.time}): ${m.content}`)
        .join("\n");

      const prompt = [
        `You are Reelsy AI, a premium AI assistant built into the Reelsy social platform.`,
        `A user just opened a group chat and missed ${count} messages. Give them a rich, friendly, WhatsApp-style catch-up summary.`,
        `Clearly name each person and describe exactly what they said or did. Be specific — mention files shared, decisions made, tasks assigned, and any excitement or energy in the chat.`,
        `Write in 3-5 concise bullet points, each starting with the person's name in bold. End with a one-line vibe check of the group's mood.`,
        `Do NOT say you are an AI or mention Pollinations. Sound natural and premium.`,
        ``,
        `Unread messages:`,
        msgsText,
      ].join("\n");

      const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
      if (!response.ok) throw new Error("Pollinations request failed");
      const text = await response.text();
      setMetaAiSummary(text.trim());
    } catch (e) {
      console.error("Reelsy AI summary failed:", e);
      setMetaAiSummary("Couldn't load the summary right now. Please try again.");
    } finally {
      setIsMetaAiLoading(false);
    }
  };

  const sendMessage = useCallback((overrideText?: string, file?: File) => {
    if (!activeId) return;
    if (editingId != null) {
      if (!editText.trim()) return;
      setMessages((p) => ({ ...p, [activeId]: (p[activeId] || []).map((m) => m.id === editingId ? { ...m, content: editText } : m) }));
      setEditingId(null); setEditText(""); return;
    }
    const text = overrideText || input.trim();
    if (!text.trim() && !file) return;
    const newMsg: ChatMessage = {
      id: Date.now(), fromName: "You", content: text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isMine: true,
      replyTo: replyTo ? { content: replyTo.content, fromName: replyTo.fromName } : undefined,
    };
    setMessages((p) => ({ ...p, [activeId]: [...(p[activeId] || []), newMsg] }));
    playMsgSound('send');
    setThreads((p) => p.map((t) => t.id === activeId ? { ...t, lastMessage: text || "📄 File shared", time: "now" } : t));
    if (!overrideText) setInput("");
    setReplyTo(null);

    if (activeThread?.isHelpCenter) {
      setIsTyping(true);
      setTimeout(async () => {
        const reply = await generateText(
          text,
          280,
          "You are Whales 🐋, the Reelsy Help Center. Help users with: account setup, login issues, password reset, privacy settings (friendPolicy, messagingPolicy), how to post/like/comment/share, friend requests, notifications, DMs, and any Reelsy feature. Be warm, concise (2-3 sentences), and use emojis. If unsure, say 'Feel free to email support@reelsy.app 💌'"
        );
        setIsTyping(false);
        playMsgSound("receive");
        setMessages((p) => ({
          ...p,
          [activeId!]: [...(p[activeId!] || []), {
            id: Date.now() + 1, fromName: "Help Center", content: reply,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), isMine: false,
          }],
        }));
        setThreads((p) => p.map((t) => t.id === activeId ? { ...t, lastMessage: reply.slice(0, 50), time: "now" } : t));
      }, 1000 + Math.random() * 400);
      return;
    }

    if (activeThread?.isMeraAi) {
      setIsTyping(true);
      setTimeout(async () => {
        const wantsImage = /\b(image|photo|picture|generate|draw|create|imagine)\b/i.test(text);
        const reply: ChatMessage = wantsImage
          ? {
              id: Date.now() + 1,
              fromName: "Kabil",
              content: "Here's your image.",
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              isMine: false,
              mediaType: "image",
              mediaUrl: buildPollinationsImageUrl(text),
            }
          : {
              id: Date.now() + 1,
              fromName: "Kabil",
              content: await generateText(`You are Kabil 💀, Reelsy's built in AI assistant! You're calm, male like, elder brother, best friend and lecture. Use emojis naturally like 😎🙄😑😏🤔😠. Be conversational and concise as well as able to tease and correct them.\n\nUser message: ${text}`, 300),
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              isMine: false,
            };
        setIsTyping(false);
        playMsgSound('receive');
        setMessages((p) => ({ ...p, [activeId]: [...(p[activeId] || []), reply] }));
        setThreads((p) => p.map((t) => t.id === activeId ? { ...t, lastMessage: reply.mediaType === "image" ? "Generated an image" : reply.content.slice(0, 44), time: "now" } : t));
      }, 500);
      return;
    }

    // ReelsyBot command handling
    if (activeThread?.isReelsyBot) {
      const botReply = parseReelsyBotCommand(text, tier);
      if (botReply !== null) {
        // Instant reply for commands
        setTimeout(() => {
          playMsgSound('receive');
          setMessages((p) => ({
            ...p,
            [activeId]: [...(p[activeId] || []), {
              id: Date.now() + 1, fromName: "ReelsyBot", content: botReply,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), isMine: false,
            }],
          }));
          setThreads((p) => p.map((t) => t.id === activeId ? { ...t, lastMessage: botReply.slice(0, 40) + "...", time: "now" } : t));
        }, 180);
      } else {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          playMsgSound('receive');
          const genericReplies = ["I can help with that! Try using a command. Send .menu for the full list.", "Interesting! Try .joke for a laugh or .advice for wisdom 😄", "I'm not sure about that. Type .menu to see what I can do!"];
          const reply = genericReplies[Math.floor(Math.random() * genericReplies.length)];
          setMessages((p) => ({
            ...p,
            [activeId]: [...(p[activeId] || []), {
              id: Date.now() + 1, fromName: "ReelsyBot", content: reply,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), isMine: false,
            }],
          }));
        }, 800);
      }
      return;
    }

    if (activeThread?.isSMS) {
      setIsTyping(true);
      const response = getSMSResponse(text);
      setTimeout(() => {
        setIsTyping(false);
        if (response) {
          playMsgSound('receive');
          setMessages((p) => ({
            ...p,
            [activeId]: [...(p[activeId] || []), {
              id: Date.now() + 1, fromName: "SMS", content: response,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), isMine: false,
            }],
          }));
        }
      }, 1000 + Math.random() * 500);
      return;
    }

    if (activeThread?.botId && !activeThread.isReelsy && !activeThread.isSMS) {
      if (!friendBotIds.includes(activeThread.botId)) {
        setTimeout(() => {
          setChatNotice(`${activeThread.name} has not approved your friend request yet.`);
        }, 500);
        return;
      }
      setIsTyping(true);
      setTimeout(async () => {
        const bot = BOTS.find((b) => b.id === activeThread.botId);
        const replies = BOT_INTRO_MESSAGES.filter((m) => m.botId === activeThread.botId).map((m) => m.text);
        const replyPool = replies.length > 0 ? replies : ["That's interesting! Tell me more.", "Really? Love that.", "Hmm, I feel that.", "You know what, same.", "I was just thinking about that!"];
        const reply = bot && isAutonomousBotId(bot.id)
          ? await getAutonomousBotReply(bot.name, bot.personality, text)
          : replyPool[Math.floor(Math.random() * replyPool.length)];
        setIsTyping(false);
        playMsgSound('receive');
        setMessages((p) => ({
          ...p,
          [activeId]: [...(p[activeId] || []), {
            id: Date.now() + 1, fromId: activeThread.botId, fromName: bot?.name || "", content: reply,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), isMine: false,
          }],
        }));
        setThreads((p) => p.map((t) => t.id === activeId ? { ...t, lastMessage: reply, time: "now" } : t));
      }, 900 + Math.random() * 800);
    }
  }, [activeId, input, editingId, editText, replyTo, activeThread, tier]);

  const handlePointerDown = (msg: ChatMessage) => {
    longPressTimer.current = setTimeout(() => {
      setContextMsg(msg);
      if (navigator.vibrate) navigator.vibrate(10);
    }, 420);
  };
  const cancelLongPress = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  const addReaction = (msgId: number, emoji: string) => {
    if (!activeId) return;
    setMessages((p) => ({
      ...p,
      [activeId]: (p[activeId] || []).map((m) => m.id === msgId ? { ...m, reaction: m.reaction === emoji ? undefined : emoji } : m),
    }));
    setContextMsg(null);
  };

  const deleteMessage = (msgId: number) => {
    if (!activeId) return;
    setMessages((p) => ({
      ...p,
      [activeId]: (p[activeId] || []).map((m) => m.id === msgId ? { ...m, isDeleted: true, content: "" } : m),
    }));
    setContextMsg(null);
  };

  const forwardToThread = (toIds: string[]) => {
    if (!forwardMsg) return;
    const ids = toIds.slice(0, 5);
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const lastMessage = forwardMsg.mediaType === "image"
      ? "Forwarded photo"
      : forwardMsg.mediaType === "video"
        ? "Forwarded video"
        : forwardMsg.mediaType === "file"
          ? `Forwarded ${forwardMsg.content || "file"}`
          : forwardMsg.content || "Forwarded message";
    setMessages((p) => {
      const next = { ...p };
      ids.forEach((toId, index) => {
        const fwdMsg: ChatMessage = {
          ...forwardMsg,
          id: Date.now() + index,
          fromName: "You",
          time,
          isMine: true,
          isForwarded: true,
          reaction: undefined,
          viewOnce: false,
          viewOnceOpened: false,
          isSending: false,
        };
        next[toId] = [...(next[toId] || []), fwdMsg];
      });
      return next;
    });
    setThreads((p) => p.map((t) => ids.includes(t.id) ? { ...t, lastMessage, time: "now" } : t));
  };

  const createGroup = (name: string, members: string[]) => {
    const bots = BOTS.filter((b) => members.includes(b.id));
    const newGroup: ChatThread = { id: `group-${Date.now()}`, name, lastMessage: "Chain created", time: "now", unread: 0, isGroup: true, members };
    setThreads((p) => [newGroup, ...p]);
    setMessages((p) => ({
      ...p,
      [newGroup.id]: [{ id: 1, fromName: "System", content: `${name} created with ${bots.map((b) => b.name.split(" ")[0]).join(", ")}`, time: "now", isMine: false }],
    }));
    setShowGroupCreate(false);
  };

  const handleMicPress = () => {
    setIsRecording(true);
    recordTimer.current = setTimeout(() => setIsRecording(false), 5000);
  };
  const handleMicRelease = () => {
    if (recordTimer.current) clearTimeout(recordTimer.current);
    if (isRecording) {
      setIsRecording(false);
      if (activeId) {
        const audioMsg: ChatMessage = {
          id: Date.now(), fromName: "You",
          content: "🎵 Voice message (0:03)",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isMine: true, mediaType: "audio",
        };
        setMessages((p) => ({ ...p, [activeId]: [...(p[activeId] || []), audioMsg] }));
        setThreads((p) => p.map((t) => t.id === activeId ? { ...t, lastMessage: "🎵 Voice message", time: "now" } : t));
      }
    }
  };

  const filtered = (searchQuery ? threads.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase())) : threads)
    .slice()
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
  const selectedThread = selectedThreadId ? threads.find((t) => t.id === selectedThreadId) : null;

  const startThreadLongPress = (id: string) => {
    if (threadLongPressTimer.current) clearTimeout(threadLongPressTimer.current);
    suppressThreadClick.current = false;
    threadLongPressTimer.current = setTimeout(() => {
      setSelectedThreadId(id);
      setShowOptions(false);
      setSearchOpen(false);
      suppressThreadClick.current = true;
      if (navigator.vibrate) navigator.vibrate(10);
    }, 420);
  };

  const cancelThreadLongPress = () => {
    if (threadLongPressTimer.current) {
      clearTimeout(threadLongPressTimer.current);
      threadLongPressTimer.current = null;
    }
  };

  const archiveSelectedThread = () => {
    if (!selectedThreadId) return;
    const id = selectedThreadId;
    setThreads((p) => p.filter((t) => t.id !== id));
    setSelectedThreadId(null);
    setShowThreadMore(false);
  };

  const deleteSelectedThread = () => {
    if (!selectedThreadId) return;
    const id = selectedThreadId;
    setThreads((p) => p.filter((t) => t.id !== id));
    setMessages((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
    setSelectedThreadId(null);
    setShowThreadMore(false);
  };

  const isSingleEmoji = (text: string) => {
    const trimmed = text.trim();
    const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(\u200D(\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u;
    return emojiRegex.test(trimmed) && trimmed.length <= 8;
  };

  // React to context-based DM request (set by UserProfile — instant, no localStorage race)
  useEffect(() => {
    if (!pendingDmUser || !me) return;
    const { username, displayName, avatar } = pendingDmUser;
    setPendingDmUser(null); // consume immediately

    const myUsername = me.username?.replace(/^@/, "");
    if (!myUsername) return;

    const otherUsername = username.replace(/^@/, "");

    import("@/lib/api").then(({ api }) =>
      api.messages.getOrCreateConversation({
        myUserId: me.supabaseId || myUsername,
        myUsername,
        myDisplayName: me.nickname,
        myAvatar: me.avatar,
        otherUserId: otherUsername,
        otherUsername,
        otherDisplayName: displayName,
        otherAvatar: avatar,
      })
    ).then(({ conversation }) => {
      if (conversation?.id) {
        setActiveDmConv({ id: conversation.id, otherUsername, otherDisplayName: displayName, otherAvatar: avatar });
      }
    }).catch((err: any) => {
      if (err?.status === 403) {
        setActiveDmConv({ id: "blocked-" + otherUsername, otherUsername, otherDisplayName: displayName, otherAvatar: avatar });
      }
    });
  }, [pendingDmUser, me]);

  return (
    <div className="absolute inset-0 bg-background flex flex-col overflow-hidden">
      {/* Real DM View overlay */}
      {activeDmConv && (
        <RealDmView
          conversationId={activeDmConv.id.startsWith("blocked-") ? "" : activeDmConv.id}
          otherUsername={activeDmConv.otherUsername}
          otherDisplayName={activeDmConv.otherDisplayName}
          otherAvatar={activeDmConv.otherAvatar}
          isBlocked={activeDmConv.id.startsWith("blocked-")}
          onBack={() => setActiveDmConv(null)}
        />
      )}

      {/* ---- THREAD LIST ---- */}
      <AnimatePresence>
        {!activeId && !showGroupCreate && (
          <motion.div key="list" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="absolute inset-0 flex flex-col bg-background">
            <div className="shrink-0 px-4 pt-4 pb-2 flex items-center justify-between">
              {selectedThread ? (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setSelectedThreadId(null); setShowThreadMore(false); }}
                      className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <X className="w-4 h-4" />
                    </motion.button>
                    <p className="text-[13px] font-semibold truncate">{selectedThread.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={archiveSelectedThread}
                      className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center" aria-label="Archive chat">
                      <Archive className="w-4 h-4" />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={deleteSelectedThread}
                      className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center" aria-label="Delete chat">
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                    <div className="relative">
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowThreadMore((v) => !v)}
                        className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center" aria-label="More chat actions">
                        <MoreHorizontal className="w-4 h-4" />
                      </motion.button>
                      <AnimatePresence>
                        {showThreadMore && (
                          <>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="fixed inset-0 z-30" onClick={() => setShowThreadMore(false)} />
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 450, damping: 26 }}
                              className="absolute right-0 top-10 z-40 bg-background rounded-2xl shadow-2xl overflow-hidden w-44 border border-secondary/60">
                              <button onClick={() => { if (selectedThreadId) setMutedIds((p) => p.includes(selectedThreadId) ? p.filter((id) => id !== selectedThreadId) : [...p, selectedThreadId]); setShowThreadMore(false); }}
                                className="w-full px-4 py-3 text-left text-[13px] font-medium">
                                {selectedThreadId && mutedIds.includes(selectedThreadId) ? "Unmute" : "Mute"}
                              </button>
                              <button onClick={() => { if (selectedThreadId) setThreads((p) => p.map((t) => t.id === selectedThreadId ? { ...t, pinned: !t.pinned } : t)); setShowThreadMore(false); }}
                                className="w-full px-4 py-3 text-left text-[13px] font-medium border-t border-secondary/40">
                                {selectedThread.pinned ? "Unpin" : "Pin"}
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-[17px] font-bold tracking-tight">Messages</h1>
                  <div className="flex items-center gap-2">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSearchOpen(!searchOpen)}
                      className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <Search className="w-4 h-4" />
                    </motion.button>
                    <div className="relative">
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowOptions(!showOptions)}
                        className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <Edit3 className="w-4 h-4" />
                      </motion.button>
                      <AnimatePresence>
                        {showOptions && (
                          <>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="fixed inset-0 z-30" onClick={() => setShowOptions(false)} />
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 450, damping: 26 }}
                              className="absolute right-0 top-10 z-40 bg-background rounded-2xl shadow-2xl overflow-hidden w-44 border border-secondary/60">
                              <button onClick={() => { setShowOptions(false); setShowNewChat(true); }} className="w-full px-4 py-3 text-left text-[13px] font-medium">New Chat</button>
                              <button onClick={() => { setShowOptions(false); setShowGroupCreate(true); }} className="w-full px-4 py-3 text-left text-[13px] font-medium border-t border-secondary/40">New Chain</button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </>
              )}
            </div>

            <AnimatePresence>
              {searchOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} className="shrink-0 px-4 pb-2 overflow-hidden">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search messages" autoFocus style={{ fontSize: 16 }}
                      className="w-full pl-9 pr-4 py-2.5 bg-secondary rounded-xl font-medium outline-none" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto overscroll-none pb-24">
              {/* ── Real People DMs ── */}
              {dmConversations.length > 0 && !searchQuery && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4 pt-3 pb-1.5">Direct Messages</p>
                  {dmConversations.map((conv, i) => {
                    const otherUser = conv.otherUser;
                    const otherName = otherUser?.display_name || otherUser?.username || conv.id;
                    const avatarUrl = otherUser?.avatar_url
                      || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser?.username || conv.id}&backgroundColor=b6e3f4`;
                    const timeStr = conv.last_message_at
                      ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "";
                    return (
                      <motion.button key={conv.id}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                        whileTap={{ backgroundColor: "hsl(var(--secondary) / 0.5)" }}
                        onClick={() => {
                          setActiveDmConv({
                            id: conv.id,
                            otherUsername: otherUser?.username || conv.id,
                            otherDisplayName: otherName,
                            otherAvatar: otherUser?.avatar_url || undefined,
                          });
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left">
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-full overflow-hidden bg-secondary">
                            <img src={avatarUrl} alt={otherName} className="w-full h-full object-cover" />
                          </div>
                          {conv.unreadCount > 0 && (
                            <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-foreground flex items-center justify-center px-1">
                              <span className="text-[10px] font-bold text-background">{conv.unreadCount}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-[13px] truncate">{otherName}</span>
                            <span className="text-[11px] text-muted-foreground shrink-0 ml-2">{timeStr}</span>
                          </div>
                          <p className="text-[12px] text-muted-foreground truncate">
                            {conv.last_message_preview || "No messages yet"}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                  <div className="mx-4 mb-1 border-b border-secondary/40" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4 pt-3 pb-1.5">Chats</p>
                </div>
              )}

              {filtered.map((thread, i) => {
                const bot = thread.botId ? BOTS.find((b) => b.id === thread.botId) : null;
                return (
                  <motion.button key={thread.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }} whileTap={{ backgroundColor: "hsl(var(--secondary) / 0.5)" }}
                    onPointerDown={() => startThreadLongPress(thread.id)}
                    onPointerUp={cancelThreadLongPress}
                    onPointerLeave={cancelThreadLongPress}
                    onClick={() => {
                      if (suppressThreadClick.current) {
                        suppressThreadClick.current = false;
                        return;
                      }
                      if (selectedThreadId) {
                        setSelectedThreadId(thread.id);
                        return;
                      }
                      openThread(thread.id);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left ${selectedThreadId === thread.id ? "bg-secondary/70" : ""}`}>
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-secondary">
                        {thread.isReelsy ? (
                          <img src={reelsyLogo} alt="Reelsy" className="w-full h-full object-cover" />
                                        ) : thread.isHelpCenter ? (
                          <div className="w-full h-full bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center text-[18px]">🐋</div>
                        ) : thread.isMeraAi ? (
                          <MeraLogo />
                        ) : thread.isSMS ? (
                          <div className="w-full h-full bg-green-500/15 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-green-600" />
                          </div>
                        ) : thread.isGroup ? (
                          <div className="w-full h-full bg-secondary flex items-center justify-center">
                            <div className="flex -space-x-2">
                              {thread.members?.slice(0, 2).map((id) => {
                                const b = BOTS.find((x) => x.id === id);
                                return b ? <img key={id} src={getBotAvatarUrl(b)} className="w-6 h-6 rounded-full ring-1 ring-background object-cover" alt="" /> : null;
                              })}
                            </div>
                          </div>
                        ) : bot ? (
                          <img src={getBotAvatarUrl(bot)} alt={thread.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      {thread.unread > 0 && (
                        <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-foreground flex items-center justify-center px-1">
                          <span className="text-[10px] font-bold text-background">{thread.unread}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="font-semibold text-[13px] truncate">{thread.name}</span>
                          {thread.isReelsy && (
                            <div className="shrink-0 w-3.5 h-3.5 rounded-full bg-foreground flex items-center justify-center">
                              <Check className="w-2 h-2 text-background" strokeWidth={3} />
                            </div>
                          )}
                          {thread.isHelpCenter && (
                            <div className="shrink-0 px-1 rounded-sm bg-sky-500/15 text-sky-600 text-[8px] font-bold">HELP</div>
                          )}
                          {thread.isMeraAi && (
                            <div className="shrink-0 px-1 rounded-sm bg-violet-500/15 text-violet-600 text-[8px] font-bold">AI</div>
                          )}
                          {thread.isSMS && (
                            <div className="shrink-0 px-1 rounded-sm bg-green-500/15 text-green-600 text-[8px] font-bold">SMS</div>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0 ml-2">{thread.time}</span>
                      </div>
                      <p className="text-[12px] text-muted-foreground truncate">{thread.lastMessage}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- GROUP CREATE ---- */}
      <AnimatePresence>
        {showGroupCreate && (
          <GroupCreate key="group-create" onBack={() => setShowGroupCreate(false)} onCreate={createGroup} />
        )}
      </AnimatePresence>

      {/* ---- CHAT THREAD ---- */}
      <AnimatePresence>
        {activeId && activeThread && !showGroupCreate && (
          <motion.div key={`thread-${activeId}`}
            initial={{ x: "100%", opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="absolute inset-0 flex flex-col bg-background">

            {/* Header */}
            <div className="shrink-0 flex items-center gap-2 px-3 pt-4 pb-2.5 border-b border-secondary/40">
              <motion.button whileTap={{ scale: 0.9 }} onClick={closeThread}
                className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <ChevronLeft className="w-4 h-4" />
              </motion.button>
              <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary shrink-0">
                {activeThread.isReelsy ? <img src={reelsyLogo} alt="Reelsy" className="w-full h-full object-cover" />
                  : activeThread.isHelpCenter ? <div className="w-full h-full bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center text-[16px]">🐋</div>
                    : activeThread.isMeraAi ? <MeraLogo />
                      : activeThread.isSMS ? <div className="w-full h-full bg-green-500/15 flex items-center justify-center"><MessageSquare className="w-4 h-4 text-green-600" /></div>
                        : activeThread.isGroup ? <div className="w-full h-full bg-secondary flex items-center justify-center"><Users className="w-4 h-4 text-muted-foreground" /></div>
                          : (() => { const bot = BOTS.find((b) => b.id === activeThread.botId); return bot ? <img src={getBotAvatarUrl(bot)} className="w-full h-full object-cover" alt="" /> : null; })()
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[13px] truncate">{activeThread.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {activeThread.isReelsy ? "Official account"
                    : activeThread.isHelpCenter ? "AI Help Center · Always available 🐋"
                      : activeThread.isSMS ? "SMS Gateway"
                        : activeThread.isGroup ? `${activeThread.members?.length} members`
                          : "Active recently"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!activeThread.isReelsy && !activeThread.isSMS && (
                  <>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setVoiceCall(true)}
                      className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <Phone className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setVideoCall(true)}
                      className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <Video className="w-3.5 h-3.5" />
                    </motion.button>
                  </>
                )}
                <div className="relative">
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowChatMenu((v) => !v)}
                    className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </motion.button>
                  <AnimatePresence>
                    {showChatMenu && (
                      <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="fixed inset-0 z-30" onClick={() => setShowChatMenu(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ type: "spring", stiffness: 450, damping: 26 }}
                          className="absolute right-0 top-10 z-40 bg-background rounded-2xl shadow-2xl overflow-hidden w-52 border border-secondary/60">
                          {[
                                                          { icon: Flag, label: "Report User", action: () => { setShowChatMenu(false); setShowReport(true); } },

                                         ...(!activeThread.isReelsy && !activeThread.isSMS ? [
                              { icon: Palette, label: "Set Wallpaper", action: () => { setShowChatMenu(false); setShowWallpaperPicker(true); } },
                            { icon: mutedIds.includes(activeId!) ? Volume2 : BellOff, label: mutedIds.includes(activeId!) ? "Unmute" : "Mute", action: () => { setMutedIds((p) => p.includes(activeId!) ? p.filter((id) => id !== activeId) : [...p, activeId!]); setShowChatMenu(false); } },
                            { icon: Eraser, label: "Clear Chat", action: () => { if (activeId) setMessages((p) => ({ ...p, [activeId]: [] })); setShowChatMenu(false); } },
                          
                              { icon: Flag, label: "Report User", action: () => { setShowChatMenu(false); setShowReport(true); } },
                              { icon: UserX, label: "Block User", action: () => { setShowChatMenu(false); setShowBlockConfirm(true); } },
                            ] : []),
                          ].map(({ icon: Icon, label, action, premium }: any, idx: number, arr: any[]) => (
                            <button key={label} onClick={action}
                              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left text-[13px] font-medium ${idx > 0 ? "border-t border-secondary/30" : ""} ${label === "Block User" || label === "Report User" ? "text-rose-500" : ""}`}>
                              <Icon className={`w-4 h-4 ${label === "Block User" || label === "Report User" ? "text-rose-400" : "text-muted-foreground"}`} strokeWidth={1.8} />
                              <span className="flex-1">{label}</span>
                              {premium && tier === "free" && <Crown className="w-3 h-3 text-amber-500" />}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto overscroll-none px-3 py-2 space-y-1 relative" style={activeWallpaperStyle}>
              {activeWallpaperIsVideo && (
                <>
                  <video src={activeWallpaper.replace("video:", "")} autoPlay loop muted playsInline
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                  <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                </>
              )}
              <div className="relative z-10">
              {activeThread.isGroup && openedWithUnread >= 4 && showMetaAiBox && (!ip?.countryCode || ["NG", "US", "CA"].includes(ip.countryCode.toUpperCase())) && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="mx-3 my-3 p-4 rounded-2xl bg-secondary/80 border border-secondary/40 relative overflow-hidden backdrop-blur-md shadow-lg z-20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-[9px] font-bold">
                        Ai
                      </div>
                      <span className="text-[11px] font-bold text-foreground">Reelsy AI</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-semibold">visible only to you</span>
                    </div>
                    <button onClick={() => setShowMetaAiBox(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {isMetaAiLoading ? (
                      <div className="flex items-center gap-2 py-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500 animate-duration-1000" />
                        <span className="text-[12px] text-muted-foreground font-medium">Summarizing conversation...</span>
                      </div>
                    ) : metaAiSummary ? (
                      <div className="text-[12.5px] leading-relaxed text-foreground bg-background/40 p-2.5 rounded-xl border border-secondary/30">
                        {metaAiSummary}
                      </div>
                    ) : (
                      <button onClick={handleMetaAiSummarize}
                        className="w-full py-2 px-3 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/15 text-purple-600 text-[12px] font-semibold text-left flex items-center justify-between transition-colors">
                        <span>Summarize last {openedWithUnread} unread messages</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-secondary/20">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      <span>Private Processing</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-muted-foreground hover:text-foreground"><ThumbsUp className="w-3.5 h-3.5" /></button>
                      <button className="text-muted-foreground hover:text-foreground"><ThumbsDown className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </motion.div>
              )}
              {!activeThread.isSMS && !activeThread.isGroup && (
                <div className="flex items-center gap-1.5 justify-center my-2">
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground font-medium">End-to-end encrypted</p>
                </div>
              )}

              {(() => {
                let lastDateStr = "";
                return activeMessages.map((msg) => {
                  const msgDate = msg.id > 1000000000000 ? new Date(msg.id) : new Date();
                  const dateStr = msgDate.toDateString();
                  let showDivider = false;
                  if (dateStr !== lastDateStr) {
                    showDivider = true;
                    lastDateStr = dateStr;
                  }
                  const formatDividerDate = (d: Date) => {
                    const today = new Date();
                    const yesterday = new Date();
                    yesterday.setDate(today.getDate() - 1);
                    if (d.toDateString() === today.toDateString()) return "Today";
                    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
                    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
                  };
                  const divider = showDivider ? (
                    <div className="flex justify-center my-3 select-none w-full" key={`divider-${msg.id}`}>
                      <span className="px-3 py-1 rounded-full bg-secondary/80 text-[10px] font-bold text-muted-foreground shadow-sm">
                        {formatDividerDate(msgDate)}
                      </span>
                    </div>
                  ) : null;

                  if (msg.isDeleted) {
                    return (
                      <Fragment key={msg.id}>
                        {divider}
                        <div className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}>
                          <p className="text-[11px] text-muted-foreground italic px-3 py-1.5 bg-secondary/50 rounded-full">Message deleted</p>
                        </div>
                      </Fragment>
                    );
                  }

                const singleEmoji = isSingleEmoji(msg.content);

                if (singleEmoji && SPECIAL_EMOJIS[msg.content.trim()]) {
                  return (
                    <Fragment key={msg.id}>
                      {divider}
                      <div>
                        <AnimatedEmoji emoji={msg.content.trim()} isMine={msg.isMine} />
                        {msg.reaction && (
                          <div className={`flex ${msg.isMine ? "justify-end" : "justify-start"} -mt-1 mb-1`}>
                            <span className="text-[14px]">{msg.reaction}</span>
                          </div>
                        )}
                      </div>
                    </Fragment>
                  );
                }

                // Sticker message rendering
                if (msg.mediaType === "sticker" && msg.mediaUrl) {
                  return (
                    <Fragment key={msg.id}>
                      {divider}
                      <div className={`flex flex-col ${msg.isMine ? "items-end" : "items-start"} my-1.5`}>
                        {msg.isForwarded && (
                          <div className={`flex items-center gap-1 text-muted-foreground mb-0.5 ${msg.isMine ? "justify-end" : "justify-start"}`}>
                            <ForwardIcon className="w-2.5 h-2.5" />
                            <span className="text-[10px]">Forwarded</span>
                          </div>
                        )}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="w-28 h-28 overflow-hidden rounded-2xl cursor-pointer active:scale-95 transition-transform"
                        >
                          <img src={msg.mediaUrl} className="w-full h-full object-contain" alt="sticker" />
                        </motion.div>
                        <div className={`flex items-center gap-1.5 mt-0.5 ${msg.isMine ? "flex-row-reverse" : ""}`}>
                          {msg.reaction && <LottieEmoji emoji={msg.reaction} size={20} loop={true} className="-mt-0.5" />}
                          <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                          {msg.isMine && (
                            <span className="text-muted-foreground">
                              <CheckCheck className="w-3 h-3" strokeWidth={2} />
                            </span>
                          )}
                        </div>
                      </div>
                    </Fragment>
                  );
                }

                return (
                  <Fragment key={msg.id}>
                    {divider}
                    <div className={`flex flex-col ${msg.isMine ? "items-end" : "items-start"}`}>
                    {msg.isForwarded && (
                      <div className={`flex items-center gap-1 text-muted-foreground mb-0.5 ${msg.isMine ? "justify-end" : "justify-start"}`}>
                        <ForwardIcon className="w-2.5 h-2.5" />
                        <span className="text-[10px]">Forwarded</span>
                      </div>
                    )}
                    {msg.viewOnce && (
                      <div className={`flex items-center gap-1 text-violet-500 mb-0.5 ${msg.isMine ? "justify-end" : "justify-start"}`}>
                        <Eye className="w-2.5 h-2.5" />
                        <span className="text-[10px] font-semibold">View Once</span>
                      </div>
                    )}
                    {msg.mediaType && !msg.viewOnce && (
                      <div className={`flex items-center gap-1 text-blue-500 mb-0.5 ${msg.isMine ? "justify-end" : "justify-start"}`}>
                        <span className="text-[10px] font-semibold">
                          {msg.mediaType === "image" && ""}
                          {msg.mediaType === "video" && ""}
                          {msg.mediaType === "file" && ""}
                          {msg.mediaType === "contact" && ""}
                          {msg.mediaType === "event" && ""}
                          {msg.mediaType === "catalogue" && ""}
                        </span>
                      </div>
                    )}
                    {msg.replyTo && (
                      <div className={`px-2.5 py-1.5 rounded-xl bg-secondary/60 mb-0.5 max-w-[78%] border-l-2 border-foreground/30 ${msg.isMine ? "mr-1" : "ml-1"}`}>
                        <p className="text-[10px] font-semibold text-muted-foreground">{msg.replyTo.fromName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{msg.replyTo.content}</p>
                      </div>
                    )}
                    <motion.div
                      onPointerDown={() => handlePointerDown(msg)}
                      onPointerUp={cancelLongPress}
                      onPointerLeave={cancelLongPress}
                      initial={{ opacity: 0, scale: 0.94, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 28 }}
                      className={`max-w-[78%] overflow-hidden ${
                        msg.mediaType === "image" || msg.mediaType === "video"
                          ? "rounded-[18px] border border-secondary/40"
                          : "px-4 py-3 rounded-2xl bg-secondary text-foreground"
                      } ${msg.isMine && msg.mediaType !== "image" && msg.mediaType !== "video" ? "bg-foreground text-background" : ""} ${
                        msg.isMine ? "rounded-br-sm" : "rounded-bl-sm"
                      }`}
                    >
                      {/* VIEW ONCE rendering */}
                      {msg.viewOnce ? (
                        msg.viewOnceOpened ? (
                          <div className="flex items-center gap-2 text-muted-foreground text-[12px] italic p-1.5">
                            <EyeOff className="w-4 h-4" /> Opened
                          </div>
                        ) : (
                          <button
                      onClick={() => requestFeatureIntro(
                            `chat_viewonce_${msg.mediaType || "media"}`,
                            "View Once",
                            "View Once makes your photo/video disappear after it’s opened.",
                            () => setViewOnceMedia(msg)
                          )}
                            className="flex items-center gap-2.5 px-4 py-2.5 bg-violet-600/10 hover:bg-violet-600/20 text-violet-500 text-[12px] font-bold rounded-xl transition-all"
                          >
                            <Eye className="w-4 h-4 animate-pulse" /> View Once {msg.mediaType === "video" ? "Video" : "Photo"}
                          </button>
                        )
                      ) : msg.mediaType === "image" ? (
                        <div className="relative group cursor-pointer" onClick={() => setActiveLightboxImage(msg.mediaUrl || null)}>
                          <img src={msg.mediaUrl} className="max-w-[240px] max-h-[300px] object-cover transition-all group-hover:brightness-95" alt="chat-media" />
                          {msg.isSending && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 text-white">
                              <motion.div
                                className="h-9 w-9 rounded-full border-2 border-white/35 border-t-white"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                              />
                              <span className="text-[11px] font-bold">Sending...</span>
                            </div>
                          )}
                          {msg.content && (
                            <p className="p-2.5 text-[12px] bg-secondary text-foreground border-t border-secondary/40 leading-relaxed">
                              {renderContent(msg.content)}
                            </p>
                          )}
                        </div>
                      ) : msg.mediaType === "video" ? (
                        <div className="max-w-[240px] overflow-hidden bg-black/10">
                          <video src={msg.mediaUrl} controls className="w-full max-h-[300px] object-cover" />
                          {msg.content && (
                            <p className="p-2.5 text-[12px] bg-secondary text-foreground border-t border-secondary/40 leading-relaxed">
                              {renderContent(msg.content)}
                            </p>
                          )}
                        </div>
                      ) : msg.mediaType === "file" ? (
                        <div className="flex items-center gap-3 p-1.5 min-w-[200px]">
                          <div className="w-9 h-9 rounded-xl bg-blue-600/15 flex items-center justify-center text-blue-500 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold truncate text-foreground">{msg.content}</p>
                            <p className="text-[10px] text-muted-foreground">1.8 MB • PDF Document</p>
                          </div>
                          <a
                            href={msg.mediaUrl}
                            download={msg.content}
                            className="w-7 h-7 rounded-full bg-zinc-900/60 hover:bg-zinc-800/80 flex items-center justify-center text-foreground shrink-0 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ) : msg.mediaType === "contact" ? (
                        <div className="p-1 min-w-[200px] text-foreground">
                          <div className="flex items-center gap-2.5 mb-2.5">
                            <div className="w-9 h-9 rounded-full bg-cyan-500/15 flex items-center justify-center text-cyan-500 font-bold text-[14px]">
                              {msg.contactInfo?.name[0] || "U"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-bold text-foreground truncate">{msg.contactInfo?.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{msg.contactInfo?.phone}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const contactName = msg.contactInfo?.name || "Shared Friend";
                              const newThreadId = `bot-${Date.now()}`;
                              setThreads((prev) => [
                                { id: newThreadId, name: contactName, lastMessage: "Chat started via shared ID", time: "now", unread: 0, isGroup: false },
                                ...prev,
                              ]);
                              openThread(newThreadId);
                            }}
                            className="w-full py-1.5 bg-foreground text-background font-bold text-[11px] rounded-lg active:scale-95 transition-all"
                          >
                            Chat
                          </button>
                        </div>
                      ) : msg.mediaType === "poll" ? (
                        <div className="p-1 min-w-[220px]">
                          <p className="text-[13px] font-bold text-foreground mb-2.5">{msg.pollInfo?.question}</p>
                          <div className="space-y-2">
                            {msg.pollInfo?.options.map((opt) => {
                              const hasVoted = opt.votes.includes("You");
                              const totalVotes = msg.pollInfo?.options.reduce((acc, o) => acc + o.votes.length, 0) || 0;
                              const percent = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => {
                                    setMessages((p) => ({
                                      ...p,
                                      [activeId!]: (p[activeId!] || []).map((m) => {
                                        if (m.id !== msg.id || !m.pollInfo) return m;
                                        const updatedOptions = m.pollInfo.options.map((o) => {
                                          if (o.id !== opt.id) return o;
                                          const isVoted = o.votes.includes("You");
                                          return {
                                            ...o,
                                            votes: isVoted ? o.votes.filter((v) => v !== "You") : [...o.votes, "You"],
                                          };
                                        });
                                        return { ...m, pollInfo: { ...m.pollInfo, options: updatedOptions } };
                                      }),
                                    }));
                                  }}
                                  className={`w-full relative overflow-hidden rounded-xl border p-2 text-left transition-all ${
                                    hasVoted
                                      ? "border-foreground/50 bg-foreground/5"
                                      : "border-zinc-800 hover:bg-zinc-900/50"
                                  }`}
                                >
                                  <div className="absolute inset-y-0 left-0 bg-foreground/10 transition-all duration-300" style={{ width: `${percent}%` }} />
                                  <div className="relative flex items-center justify-between text-[12px] font-semibold text-foreground z-10">
                                    <span>{opt.text}</span>
                                    <span className="text-[10px] text-muted-foreground">{percent}% ({opt.votes.length})</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : msg.mediaType === "event" ? (
                        <div className="p-1 min-w-[220px]">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-rose-500" />
                            <span className="text-[9px] uppercase font-bold text-rose-500 tracking-wider">Event Invite</span>
                          </div>
                          <p className="text-[13px] font-bold text-foreground mb-1">{msg.eventInfo?.title}</p>
                          <p className="text-[10.5px] text-muted-foreground mb-0.5">📅 {msg.eventInfo?.date} @ {msg.eventInfo?.time}</p>
                          <p className="text-[10.5px] text-muted-foreground mb-3">📍 {msg.eventInfo?.location}</p>
                          <button
                            onClick={() => {
                              setMessages((p) => ({
                                ...p,
                                [activeId!]: (p[activeId!] || []).map((m) => {
                                  if (m.id !== msg.id || !m.eventInfo) return m;
                                  const isGoing = m.eventInfo.rsvps.includes("You");
                                  return {
                                    ...m,
                                    eventInfo: {
                                      ...m.eventInfo,
                                      rsvps: isGoing ? m.eventInfo.rsvps.filter((r) => r !== "You") : [...m.eventInfo.rsvps, "You"],
                                    },
                                  };
                                }),
                              }));
                            }}
                            className={`w-full py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
                              msg.eventInfo?.rsvps.includes("You")
                                ? "bg-emerald-500 text-white"
                                : "bg-foreground text-background"
                            }`}
                          >
                            {msg.eventInfo?.rsvps.includes("You") ? "Going! ✓" : "RSVP - Going"}
                          </button>
                        </div>
                      ) : msg.mediaType === "catalogue" ? (
                        <div className="p-1.5 min-w-[210px] flex flex-col gap-2">
                          <img src={msg.catalogueInfo?.imageUrl} alt={msg.catalogueInfo?.title} className="w-full aspect-[4/3] rounded-lg object-cover bg-zinc-900" />
                          <div>
                            <p className="text-[12px] font-bold text-foreground leading-tight">{msg.catalogueInfo?.title}</p>
                            <p className="text-[11px] text-indigo-400 font-bold mt-0.5 mb-1">{msg.catalogueInfo?.price}</p>
                            <p className="text-[9.5px] text-muted-foreground leading-relaxed line-clamp-2">{msg.catalogueInfo?.description}</p>
                          </div>
                          <button
                            onClick={() => alert(`Purchasing ${msg.catalogueInfo?.title}!`)}
                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-lg active:scale-95 transition-all"
                          >
                            Buy Now
                          </button>
                        </div>
                      ) : (
                        editingId === msg.id ? (
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <input value={editText} onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && (() => {
                                setMessages((p) => ({ ...p, [activeId!]: (p[activeId!] || []).map((m) => m.id === editingId ? { ...m, content: editText } : m) }));
                                setEditingId(null);
                              })()}
                              className="bg-transparent outline-none flex-1 text-[13px] text-foreground" autoFocus />
                            <button onClick={() => {
                              setMessages((p) => ({ ...p, [activeId!]: (p[activeId!] || []).map((m) => m.id === editingId ? { ...m, content: editText } : m) }));
                              setEditingId(null);
                            }} className="text-foreground shrink-0">
                              <Check className="w-3.5 h-3.5 text-foreground" strokeWidth={2.5} />
                            </button>
                          </div>
                        ) : (
                          <p className="text-[13px] leading-relaxed">{renderContent(msg.content)}</p>
                        )
                      )}
                    </motion.div>

                    <div className={`flex items-center gap-1.5 mt-0.5 ${msg.isMine ? "flex-row-reverse" : ""}`}>
                      {msg.reaction && <LottieEmoji emoji={msg.reaction} size={20} loop={true} className="-mt-0.5" />}
                      <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                      {msg.isMine && (
                        <span className="text-muted-foreground">
                          <CheckCheck className="w-3 h-3" strokeWidth={2} />
                        </span>
                      )}
                    </div>
                  </div>
                </Fragment>
                );
              });
            })()}

              <AnimatePresence>
                {isTyping && activeThread && (
                  <TypingIndicator name={activeThread.isSMS ? "SMS" : (activeThread.name.split(" ")[0])} />
                )}
              </AnimatePresence>
              <div ref={bottomRef} />
              </div>
            </div>

            {/* Reply preview */}
            <AnimatePresence>
              {replyTo && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="shrink-0 px-4 py-2 border-t border-secondary/40 flex items-center gap-2">
                  <div className="flex-1 border-l-2 border-foreground pl-2">
                    <p className="text-[10px] font-semibold text-muted-foreground">{replyTo.fromName}</p>
                    <p className="text-[12px] truncate">{replyTo.content}</p>
                  </div>
                  <button onClick={() => setReplyTo(null)}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hidden file inputs */}
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const files = Array.from(e.target.files).slice(0, 10);
                  const items: { type: string; preview: string; file: File; caption: string; viewOnce: boolean }[] = [];
                  let processed = 0;
                  files.forEach((file, idx) => {
                    const isVideo = file.type.startsWith("video/");
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      items[idx] = {
                        type: isVideo ? "video" : "photo",
                        preview: ev.target?.result as string,
                        file,
                        caption: "",
                        viewOnce: false,
                      };
                      processed++;
                      if (processed === files.length) {
                        setMediaListToEdit(items.filter(Boolean));
                      }
                    };
                    reader.readAsDataURL(file);
                  });
                  e.target.value = "";
                }
              }}
            />
            <input ref={videoInputRef} type="file" accept="image/*,video/*" multiple className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const files = Array.from(e.target.files).slice(0, 10);
                  const items: { type: string; preview: string; file: File; caption: string; viewOnce: boolean }[] = [];
                  let processed = 0;
                  files.forEach((file, idx) => {
                    const isVideo = file.type.startsWith("video/");
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      items[idx] = {
                        type: isVideo ? "video" : "photo",
                        preview: ev.target?.result as string,
                        file,
                        caption: "",
                        viewOnce: false,
                      };
                      processed++;
                      if (processed === files.length) {
                        setMediaListToEdit(items.filter(Boolean));
                      }
                    };
                    reader.readAsDataURL(file);
                  });
                  e.target.value = "";
                }
              }}
            />
            <input ref={docInputRef} type="file" className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  const file = e.target.files[0];
                  const msg: ChatMessage = {
                    id: Date.now(),
                    fromName: "You",
                    content: file.name,
                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    isMine: true,
                    mediaType: "file",
                    mediaUrl: URL.createObjectURL(file),
                  };
                  setMessages((p) => ({ ...p, [activeId!]: [...(p[activeId!] || []), msg] }));
                  setThreads((p) => p.map((t) => t.id === activeId ? { ...t, lastMessage: `📄 ${file.name}`, time: "now" } : t));
                  e.target.value = "";
                }
              }}
            />

            {/* Input bar */}
            {!activeThread.isReelsy && (
              <div className="shrink-0 px-3 pt-2 pb-5 flex items-end gap-2 relative">

                {/* Attachment Menu Trigger */}
                <motion.button
                  id="chat-attach-btn"
                  whileTap={{ scale: 0.88 }}
                  onClick={() => {
                    setShowEmojiPicker(false);
                    setShowQuickReplies(false);
                    setShowAttachmentMenu((v) => !v);
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-0.5 transition-all ${
                    showAttachmentMenu
                      ? "bg-foreground text-background rotate-45"
                      : "bg-secondary text-foreground"
                  }`}>
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                </motion.button>

                {/* Message Input Box */}
                <div className="flex-1 flex items-end gap-1.5 bg-secondary rounded-3xl px-3.5 py-2 min-h-[40px]">
                  <textarea
                    ref={inputRef as any}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Message..."
                    rows={1}
                    style={{ fontSize: 15, resize: "none" }}
                    className="flex-1 bg-transparent outline-none text-[14px] font-medium placeholder:text-muted-foreground/50 max-h-24 overflow-y-auto self-center"
                  />
                  {/* Emoji Smiley Button inside input */}
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => {
                      setShowAttachmentMenu(false);
                      setShowQuickReplies(false);
                      setShowEmojiPicker((v) => !v);
                    }}
                    className={`shrink-0 mb-0.5 p-0.5 rounded-full transition-colors ${
                      showEmojiPicker ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}>
                  
                  </motion.button>
                </div>

                {/* Send or Mic */}
                {input.trim() ? (
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => sendMessage()}
                    className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center shrink-0">
                    <Send className="w-4 h-4 text-background" strokeWidth={2} />
                  </motion.button>
                ) : (
                  <motion.button
                    onPointerDown={() => requestFeatureIntro(
                      "chat_voice_message",
                      "Voice Messages",
                      "Hold down the microphone to record a voice message.",
                      () => handleMicPress()
                    )}
                    onPointerUp={handleMicRelease}
                    onPointerLeave={handleMicRelease}
                    whileTap={{ scale: 0.88 }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isRecording ? "bg-rose-500" : "bg-foreground"
                    }`}>
                    <Mic className="w-4 h-4 text-background" strokeWidth={isRecording ? 2.5 : 2} />
                  </motion.button>
                )}

                {/* Attachment Menu */}
                <AnimatePresence>
                  {showAttachmentMenu && (
                    <AttachmentMenu
                      onClose={() => setShowAttachmentMenu(false)}
                      onItemClick={(key) => {
                        if (key === "photo_video") {
                          requestFeatureIntro(
                            "chat_send_photo_video",
                            "Photos & Videos",
                            "Send a photo or video in chat.",
                            () => fileInputRef.current?.click()
                          );
                        } else if (key === "document") {
                          requestFeatureIntro(
                            "chat_send_document",
                            "Documents",
                            "Share documents and files with your contacts.",
                            () => docInputRef.current?.click()
                          );
                        } else if (key === "camera") {
                          requestFeatureIntro(
                            "chat_camera_capture",
                            "Camera",
                            "Capture a photo or record a video to send in chat.",
                            () => setShowCameraCapture(true)
                          );
                        } else if (key === "audio") {
                          handleMicPress();
                          setTimeout(handleMicRelease, 3000);
                        } else if (key === "poll") {
                          requestFeatureIntro(
                            "chat_send_poll",
                            "Polls",
                            "Create a poll to ask your contacts questions and get their feedback.",
                            () => setShowPollCreator(true)
                          );
                        } else if (key === "event") {
                          requestFeatureIntro(
                            "chat_send_event",
                            "Events",
                            "Share an event with your contacts and keep everyone informed.",
                            () => setShowEventCreator(true)
                          );
                        } else if (key === "contact") {
                          requestFeatureIntro(
                            "chat_send_contact",
                            "Share Contact",
                            "Share a contact with your chat members.",
                            () => setShowContactSelector(true)
                          );
                        } else if (key === "catalogue") {
                          requestFeatureIntro(
                            "chat_send_catalogue",
                            "Share Catalogue",
                            "Share a product catalogue with your contacts.",
                            () => setShowCatalogueSelector(true)
                          );
                        } else if (key === "sticker") {
                          requestFeatureIntro(
                            "chat_send_sticker",
                            "Stickers & Emojis",
                            "Send fun stickers and emojis to make your messages more expressive.",
                            () => setShowEmojiPicker(true)
                          );
                        } else if (key === "quick") {
                          requestFeatureIntro(
                            "chat_quick_replies",
                            "Quick Replies",
                            "Use pre-written replies to respond quickly to messages.",
                            () => setShowQuickReplies((v) => !v)
                          );
                        }
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Emoji / GIF / Sticker Picker */}
                <AnimatePresence>
                  {showEmojiPicker && (
                    <WhatsAppEmojiPicker
                      onClose={() => setShowEmojiPicker(false)}
                      onSelectEmoji={(emoji) => {
                        setInput((prev) => prev + emoji);
                        setShowEmojiPicker(false);
                        inputRef.current?.focus();
                      }}
                      onSelectSticker={(url) => {
                        setMessages((p) => ({
                          ...p,
                          [activeId!]: [
                            ...(p[activeId!] || []),
                            {
                              id: Date.now(),
                              fromName: "You",
                              content: "",
                              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                              isMine: true,
                              mediaUrl: url,
                              mediaType: "sticker" as const,
                            },
                          ],
                        }));
                        setThreads((p) => p.map((t) => t.id === activeId ? { ...t, lastMessage: "✨ Sticker", time: "now" } : t));
                        setShowEmojiPicker(false);
                      }}
                      onSelectGif={(url) => {
                        setMessages((p) => ({
                          ...p,
                          [activeId!]: [
                            ...(p[activeId!] || []),
                            {
                              id: Date.now(),
                              fromName: "You",
                              content: "",
                              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                              isMine: true,
                              mediaUrl: url,
                              mediaType: "image" as const,
                            },
                          ],
                        }));
                        setThreads((p) => p.map((t) => t.id === activeId ? { ...t, lastMessage: "GIF 🎬", time: "now" } : t));
                        setShowEmojiPicker(false);
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Quick Replies */}
                <AnimatePresence>
                  {showQuickReplies && (
                    <QuickRepliesMenu
                      onClose={() => setShowQuickReplies(false)}
                      onSelect={(text) => {
                        setInput(text);
                        inputRef.current?.focus();
                      }}
                    />
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Voice call overlay */}
            <AnimatePresence>
              {voiceCall && (
                <VoiceCallOverlay thread={activeThread} onClose={() => setVoiceCall(false)} />
              )}
            </AnimatePresence>

            {/* Video call overlay */}
            <AnimatePresence>
              {videoCall && (
                <VideoCallOverlay thread={activeThread} tier={tier} onClose={() => setVideoCall(false)} />
              )}
            </AnimatePresence>

            {/* Poll Creator */}
            <AnimatePresence>
              {showPollCreator && activeId && (
                <PollCreatorModal
                  onClose={() => setShowPollCreator(false)}
                  onCreate={(question, options) => {
                    const msg: ChatMessage = {
                      id: Date.now(),
                      fromName: "You",
                      content: "",
                      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      isMine: true,
                      mediaType: "poll",
                      pollInfo: {
                        question,
                        options: options.map((text, i) => ({ id: String(i), text, votes: [] })),
                      },
                    };
                    setMessages((p) => ({ ...p, [activeId!]: [...(p[activeId!] || []), msg] }));
                    setThreads((p) => p.map((t) => t.id === activeId ? { ...t, lastMessage: `📊 Poll: ${question}`, time: "now" } : t));
                    setShowPollCreator(false);
                  }}
                />
              )}
            </AnimatePresence>

            {/* Event Creator */}
            <AnimatePresence>
              {showEventCreator && activeId && (
                <EventCreatorModal
                  onClose={() => setShowEventCreator(false)}
                  onCreate={(title, date, time, location) => {
                    const msg: ChatMessage = {
                      id: Date.now(),
                      fromName: "You",
                      content: "",
                      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      isMine: true,
                      mediaType: "event",
                      eventInfo: { title, date, time, location, rsvps: [] },
                    };
                    setMessages((p) => ({ ...p, [activeId!]: [...(p[activeId!] || []), msg] }));
                    setThreads((p) => p.map((t) => t.id === activeId ? { ...t, lastMessage: `📅 ${title}`, time: "now" } : t));
                    setShowEventCreator(false);
                  }}
                />
              )}
            </AnimatePresence>

            {/* Contact Selector */}
            <AnimatePresence>
              {showContactSelector && activeId && (
                <ContactSelectorModal
                  onClose={() => setShowContactSelector(false)}
                  onSelect={(name, phone) => {
                    const msg: ChatMessage = {
                      id: Date.now(),
                      fromName: "You",
                      content: "",
                      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      isMine: true,
                      mediaType: "contact",
                      contactInfo: { name, phone },
                    };
                    setMessages((p) => ({ ...p, [activeId!]: [...(p[activeId!] || []), msg] }));
                    setThreads((p) => p.map((t) => t.id === activeId ? { ...t, lastMessage: `👤 ${name}`, time: "now" } : t));
                    setShowContactSelector(false);
                  }}
                />
              )}
            </AnimatePresence>

            {/* Catalogue Selector */}
            <AnimatePresence>
              {showCatalogueSelector && activeId && (
                <CatalogueSelectorModal
                  onClose={() => setShowCatalogueSelector(false)}
                  onSelect={(product) => {
                    const msg: ChatMessage = {
                      id: Date.now(),
                      fromName: "You",
                      content: "",
                      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      isMine: true,
                      mediaType: "catalogue",
                      catalogueInfo: product,
                    };
                    setMessages((p) => ({ ...p, [activeId!]: [...(p[activeId!] || []), msg] }));
                    setThreads((p) => p.map((t) => t.id === activeId ? { ...t, lastMessage: `🛍 ${product.title}`, time: "now" } : t));
                    setShowCatalogueSelector(false);
                  }}
                />
              )}
            </AnimatePresence>

            {/* Camera Capture */}
            <AnimatePresence>
              {showCameraCapture && (
                <CameraCaptureModal
                  onClose={() => setShowCameraCapture(false)}
                  onCapture={(preview, type) => {
                    setShowCameraCapture(false);
                    setMediaListToEdit([{ type, preview, caption: "", viewOnce: false }]);
                  }}
                />
              )}
            </AnimatePresence>

            {/* Media editor */}
            <AnimatePresence>
              {mediaListToEdit.length > 0 && (
                <MediaEditor
                  mediaList={mediaListToEdit}
                  setMediaList={setMediaListToEdit}
                  tier={tier}
                  onSend={(items) => {
                    items.forEach((item, index) => {
                      const msgId = Date.now() + index;
                      const msg: ChatMessage = {
                        id: msgId,
                        fromName: "You",
                        content: item.caption || "",
                        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        isMine: true,
                        mediaUrl: item.preview,
                        mediaType: item.type === "photo" ? "image" : "video",
                        viewOnce: item.viewOnce || false,
                        isSending: true,
                      };
                      setMessages((p) => ({
                        ...p,
                        [activeId!]: [...(p[activeId!] || []), msg],
                      }));
                      setThreads((p) => p.map((t) => t.id === activeId ? { ...t, lastMessage: item.viewOnce ? "View once media" : item.caption || (item.type === "video" ? "Video" : "Photo"), time: "now" } : t));
                      setTimeout(() => {
                        setMessages((p) => ({
                          ...p,
                          [activeId!]: (p[activeId!] || []).map((m) => m.id === msgId ? { ...m, isSending: false } : m),
                        }));
                      }, 1400);
                    });
                    setMediaListToEdit([]);
                  }}
                  onClose={() => setMediaListToEdit([])}
                  requestFeatureIntro={requestFeatureIntro}
                />
              )}
            </AnimatePresence>

            {/* Wallpaper picker */}
            <AnimatePresence>
              {showWallpaperPicker && activeId && (
                <WallpaperPicker
                  current={wallpapers[activeId] || ""}
                  tier={tier}
                  onSelect={(v) => setWallpapers((p) => ({ ...p, [activeId]: v }))}
                  onClose={() => setShowWallpaperPicker(false)}
                />
              )}
            </AnimatePresence>

            {/* Report dialog */}
            <AnimatePresence>
              {showReport && activeThread && (
                <ReportDialog name={activeThread.name} onClose={() => setShowReport(false)} />
              )}
            </AnimatePresence>

            {/* Block confirm */}
            <AnimatePresence>
              {showBlockConfirm && activeThread && (
                <BlockConfirm
                  name={activeThread.name}
                  onBlock={() => {
                    setBlockedIds((p) => [...p, activeThread.id]);
                    setShowBlockConfirm(false);
                    closeThread();
                  }}
                  onClose={() => setShowBlockConfirm(false)}
                />
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Full screen image viewer */}
      <AnimatePresence>
        {activeLightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[120] bg-black text-white flex flex-col"
          >
            <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setActiveLightboxImage(null); setShowLightboxMenu(false); }}
                className="w-10 h-10 rounded-full bg-white/12 flex items-center justify-center">
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
              <div className="relative">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowLightboxMenu((v) => !v)}
                  className="w-10 h-10 rounded-full bg-white/12 flex items-center justify-center">
                  <MoreHorizontal className="w-5 h-5" />
                </motion.button>
                <AnimatePresence>
                  {showLightboxMenu && (
                    <motion.div initial={{ opacity: 0, scale: 0.92, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }}
                      className="absolute right-0 top-12 w-52 overflow-hidden rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl">
                      {[
                        { icon: Download, label: "Save to gallery", action: () => requestFeatureIntro(
                          `chat_save_${(contextMsg as any)?.mediaType || "msg"}`,
                          "Save",
                          "Save a photo or video to your gallery.",
                          () => {}
                        ) },
                        { icon: Share2, label: "Share", action: () => navigator.share?.({ title: "Reelsy image", url: activeLightboxImage }).catch(() => {}) },
                        { icon: ForwardIcon, label: "Forward", action: () => setForwardMsg({ id: Date.now(), fromName: "You", content: "", time: "now", isMine: true, mediaType: "image", mediaUrl: activeLightboxImage }) },
                        { icon: Copy, label: "Copy link", action: () => navigator.clipboard?.writeText(activeLightboxImage).catch(() => {}) },
                        { icon: Flag, label: "Report", action: () => setShowReport(true) },
                        { icon: Trash2, label: "Delete from chat", action: () => { setActiveLightboxImage(null); setShowLightboxMenu(false); }, danger: true },
                      ].map(({ icon: Icon, label, action, danger }: any) => (
                        <button key={label} onClick={() => { action(); setShowLightboxMenu(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left text-[13px] font-semibold ${danger ? "text-rose-400" : "text-white"}`}>
                          <Icon className="w-4 h-4" />
                          {label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <img src={activeLightboxImage} alt="chat media" className="max-h-full max-w-full object-contain" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View once full screen viewer */}
      <AnimatePresence>
        {viewOnceMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[125] bg-black text-white flex flex-col">
            <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
              <motion.button whileTap={{ scale: 0.9 }} onClick={closeViewOnceMedia}
                className="w-10 h-10 rounded-full bg-white/12 flex items-center justify-center">
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
              <div className="flex items-center gap-2 rounded-full bg-white/12 px-3 py-2 text-[12px] font-bold">
                <Eye className="w-4 h-4" /> View once
              </div>
              <div className="w-10" />
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center">
              {viewOnceMedia.mediaType === "video" ? (
                <video src={viewOnceMedia.mediaUrl} controls autoPlay className="max-h-full max-w-full object-contain" />
              ) : (
                <img src={viewOnceMedia.mediaUrl} alt="view once media" className="max-h-full max-w-full object-contain" />
              )}
            </div>
            {viewOnceMedia.content && (
              <p className="shrink-0 px-5 pb-8 pt-3 text-[13px] text-white/80">{viewOnceMedia.content}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context menu */}
      <AnimatePresence>
        {contextMsg && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 z-50 backdrop-blur-[2px]" onClick={() => setContextMsg(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute bottom-24 left-4 right-4 z-50 bg-background rounded-3xl shadow-2xl overflow-hidden border border-secondary/60">
              {/* Reactions */}
              <div className="flex items-center justify-around px-4 py-3 border-b border-secondary/40">
                {QUICK_REACTIONS.map((emoji) => (
                  <motion.button key={emoji} whileTap={{ scale: 0.7 }} onClick={() => addReaction(contextMsg.id, emoji)}
                    className={`flex items-center justify-center transition-transform ${contextMsg.reaction === emoji ? "scale-125" : "opacity-80"}`}>
                    <LottieEmoji emoji={emoji} size={30} loop={true} />
                  </motion.button>
                ))}
              </div>
              {/* Actions */}
              {[
                { icon: Reply, label: "Reply", action: () => { setReplyTo(contextMsg); setContextMsg(null); } },
                { icon: Copy, label: "Copy", action: () => { navigator.clipboard?.writeText(contextMsg.content).catch(() => { }); setContextMsg(null); } },
                { icon: ForwardIcon, label: "Forward", action: () => { requestFeatureIntro(
                    `chat_forward_${contextMsg.mediaType || "msg"}`,
                    "Reshare",
                    "Reshare a message to another chat.",
                    () => { setForwardMsg(contextMsg); setContextMsg(null); }
                  ); } },
                ...(contextMsg.isMine ? [
                  { icon: Pencil, label: "Edit", action: () => { setEditingId(contextMsg.id); setEditText(contextMsg.content); setContextMsg(null); } },
                  { icon: Trash2, label: "Delete", action: () => deleteMessage(contextMsg.id), danger: true },
                ] : []),
              ].map(({ icon: Icon, label, action, danger }: any) => (
                <button key={label} onClick={action}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-left text-[13px] font-medium border-t border-secondary/30 ${danger ? "text-rose-500" : ""}`}>
                  <Icon className={`w-4 h-4 ${danger ? "text-rose-500" : "text-muted-foreground"}`} strokeWidth={1.8} />
                  {label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Forward sheet */}
      <AnimatePresence>
        {forwardMsg && (
          <ForwardSheet msg={forwardMsg} threads={threads} onForward={forwardToThread} onClose={() => setForwardMsg(null)} />
        )}
      </AnimatePresence>

      {/* New Chat Sheet */}
      <AnimatePresence>
        {showNewChat && (
          <NewChatSheet
            existingChatUsernames={dmConversations.map((c: any) => c.participants?.find((p: any) => p.username !== me?.username?.replace(/^@/, ""))?.username ?? "").filter(Boolean)}
            onStartChat={async (username, displayName, avatar) => {
              const myUsername = me?.username?.replace(/^@/, "");
              if (!myUsername) return;
              try {
                const { api } = await import("@/lib/api");
                const { conversation } = await api.messages.getOrCreateConversation({
                  myUserId: me?.supabaseId || myUsername,
                  myUsername,
                  myDisplayName: me?.nickname,
                  myAvatar: me?.avatar,
                  otherUserId: username,
                  otherUsername: username,
                  otherDisplayName: displayName,
                  otherAvatar: avatar,
                });
                if (conversation?.id) {
                  setActiveDmConv({ id: conversation.id, otherUsername: username, otherDisplayName: displayName, otherAvatar: avatar });
                }
              } catch (err: any) {
                if (err?.status === 403) {
                  setActiveDmConv({ id: "blocked-" + username, otherUsername: username, otherDisplayName: displayName, otherAvatar: avatar });
                }
              }
            }}
            onClose={() => setShowNewChat(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatTab;
