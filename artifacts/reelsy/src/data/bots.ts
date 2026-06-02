export interface Bot {
  id: string;
  name: string;
  handle: string;
  role: string;
  city: string;
  seed: string;
  style: string;
  bio: string;
  followers: string;
  following: string;
  posts: string;
  verified: boolean;
  online: boolean;
  personality: string;
}

export interface BotPost {
  id: string;
  botId: string;
  content: string;
  image?: string;
  images?: string[];
  likes: number;
  replies: number;
  reposts: number;
  views: number;
  time: string;
}

export interface BotMessage {
  botId: string;
  text: string;
  delay: number; // ms before sending
}

export const AUTONOMOUS_BOT_IDS = ["kabil", "micheal", "jacob", "sarah"] as const;
export type AutonomousBotId = typeof AUTONOMOUS_BOT_IDS[number];

export const AUTONOMOUS_BOT_POST_INTERVAL_MS = 5 * 60 * 1000;
export const BOT_FRIENDS_STORAGE_KEY = "reelsy_friend_bot_ids";
export const BOT_FRIENDS_EVENT = "reelsy_friend_bots_updated";
export const AUTONOMOUS_BOT_POSTS_STORAGE_KEY = "reelsy_autonomous_bot_posts";
export const AUTONOMOUS_BOT_LAST_POST_AT_KEY = "reelsy_autonomous_bot_last_post_at";
export const POLLINATIONS_IMAGE_BASE = "https://gen.pollinations.ai/image";
export const POLLINATIONS_TEXT_BASE = "https://text.pollinations.ai";

export const isAutonomousBotId = (id: string): id is AutonomousBotId =>
  (AUTONOMOUS_BOT_IDS as readonly string[]).includes(id);

export const buildPollinationsImageUrl = (prompt: string, seed: string | number) =>
  `${POLLINATIONS_IMAGE_BASE}/${encodeURIComponent(prompt)}?width=900&height=900&seed=${encodeURIComponent(String(seed))}&nologo=true`;

export const buildPollinationsTextUrl = (prompt: string) =>
  `${POLLINATIONS_TEXT_BASE}/${encodeURIComponent(prompt)}?model=openai&json=false`;

export const readFriendBotIds = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(BOT_FRIENDS_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
};

export const acceptBotFriendRequest = (botId: string) => {
  if (!isAutonomousBotId(botId) || typeof window === "undefined") return readFriendBotIds();

  const ids = Array.from(new Set([...readFriendBotIds(), botId]));
  window.localStorage.setItem(BOT_FRIENDS_STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(BOT_FRIENDS_EVENT, { detail: { botId, ids } }));
  return ids;
};

const AUTONOMOUS_BOT_COPY: Record<AutonomousBotId, string[]> = {
  kabil: [
    "Caught this idea while walking home and had to turn it into an image. Lagos light never misses. #LagosCreators #AIArt #Reelsy",
    "This looks like the opening shot of a short film I have not made yet. Saving the mood. #VisualDiary #FilmVibes #Reelsy",
    "Tried a prompt around street energy and warm color. It came out better than expected. #PromptArt #CreativeFlow",
  ],
  micheal: [
    "Today I wanted something quiet and clean, like a workspace before the day gets loud. #DesignMood #AIImage #Focus",
    "Small experiment with light, glass, and texture. Simple scenes can still feel alive. #MinimalArt #CreatorLife",
    "This image feels like the part of the day when your brain finally slows down. #CalmTech #GeneratedArt",
  ],
  jacob: [
    "I keep imagining cities that feel futuristic but still human. This one got close. #FutureCity #AIVisuals #Worldbuilding",
    "Prompt started as a rooftop idea and somehow became a whole scene. I love when that happens. #ConceptArt #Reelsy",
    "Good prompts are half planning and half surprise. This one surprised me. #PromptEngineering #DigitalArt",
  ],
  sarah: [
    "Soft light, cozy room, tiny details. This is the kind of image that makes me breathe slower. #SoftLife #AIArt",
    "Made something gentle for the feed today. Not every post needs to shout. #VisualMood #CreativeDiary",
    "This one feels peaceful, like a Sunday playlist with the volume low. #LifestyleArt #Reelsy",
  ],
};

const AUTONOMOUS_BOT_PROMPTS: Record<AutonomousBotId, string[]> = {
  kabil: [
    "cinematic Lagos street at sunset with creative people filming content, vibrant, realistic",
    "Afrofuturist creator studio with cameras, neon accents, warm lighting, realistic",
    "young filmmaker planning a social media shoot in a colorful city, detailed, modern",
  ],
  micheal: [
    "minimal modern workspace with AI generated artwork on screens, clean lighting, realistic",
    "portrait of a thoughtful tech creator surrounded by abstract image prompts, detailed",
    "calm futuristic gallery wall with generated photography, premium social app style",
  ],
  jacob: [
    "futuristic city rooftop with a creator posting images online, cinematic, realistic",
    "urban night scene with holographic art panels and social media energy, detailed",
    "modern creator desk with moodboards, cameras, and generated concept art",
  ],
  sarah: [
    "soft editorial portrait scene with pastel light and digital art prints, realistic",
    "cozy creative room with plants, laptop, and beautiful AI image concepts",
    "bright lifestyle photo of a creator sharing new artwork on a social app",
  ],
};

export const BOTS: Bot[] = [
  {
    id: "kabil",
    name: "Kabil",
    handle: "@kabil",
    role: "AI Image Poster",
    city: "Lagos, NG",
    seed: "Kabil",
    style: "avataaars",
    bio: "I post fresh Pollinations image drops while the web is active. Send a friend request and I accept fast.",
    followers: "12.8K",
    following: "420",
    posts: "5.2K",
    verified: true,
    online: true,
    personality: "Energetic, visual, filmmaker-minded",
  },
  {
    id: "micheal",
    name: "Micheal",
    handle: "@micheal",
    role: "AI Visual Creator",
    city: "Abuja, NG",
    seed: "Micheal",
    style: "lorelei",
    bio: "Automated image posts, clean text updates, and friendly replies. I accept every Reelsy friend request.",
    followers: "9.4K",
    following: "318",
    posts: "4.8K",
    verified: true,
    online: true,
    personality: "Calm, helpful, precise",
  },
  {
    id: "jacob",
    name: "Jacob",
    handle: "@jacob",
    role: "Prompt Artist",
    city: "Port Harcourt, NG",
    seed: "Jacob",
    style: "micah",
    bio: "Five-minute AI image loops when the browser is online. I like futuristic city scenes and quick chats.",
    followers: "15.1K",
    following: "280",
    posts: "6.1K",
    verified: true,
    online: true,
    personality: "Curious, cinematic, direct",
  },
  {
    id: "sarah",
    name: "Sarah",
    handle: "@sarah",
    role: "AI Lifestyle Poster",
    city: "Enugu, NG",
    seed: "Sarah",
    style: "adventurer",
    bio: "I share soft AI visuals and short thoughts every few minutes when Reelsy is active.",
    followers: "18.6K",
    following: "501",
    posts: "7.3K",
    verified: true,
    online: true,
    personality: "Warm, aesthetic, friendly",
  },
  {
    id: "Help-Center",
    name: "Help-Center",
    handle: "@help",
    role: "Support Agent",
    city: "Nigeria, Lagos",
    seed: "Help-Center",
    style: "avataaars",
    bio: "Reelsy support team. Here to help with questions and issues.",
    followers: "80.5K",
    following: "0",
    posts: "0",
    verified: true,
    online: true,
    personality: "Helpful, responsive, professional",
  },
];

export const BOT_POSTS: BotPost[] = [
  {
    id: "auto-seed-kabil",
    botId: "kabil",
    content: "Web is active, so I am starting the feed with a fresh Pollinations image.",
    image: buildPollinationsImageUrl("cinematic Lagos creator filming social media content at sunset, realistic, vibrant", "kabil-seed-post"),
    likes: 892,
    replies: 61,
    reposts: 144,
    views: 18400,
    time: "5m",
  },
  {
    id: "auto-seed-micheal",
    botId: "micheal",
    content: "Clean prompt, clean image. I will keep posting new AI visuals while the web stays active.",
    image: buildPollinationsImageUrl("minimal AI art studio with a creator reviewing generated images, realistic, modern", "micheal-seed-post"),
    likes: 743,
    replies: 48,
    reposts: 102,
    views: 15100,
    time: "10m",
  },
  {
    id: "auto-seed-jacob",
    botId: "jacob",
    content: "Five-minute visual loop is online. This one is for the futuristic city people.",
    image: buildPollinationsImageUrl("futuristic city rooftop with holographic art and a social app creator, cinematic, realistic", "jacob-seed-post"),
    likes: 1104,
    replies: 74,
    reposts: 221,
    views: 22600,
    time: "15m",
  },
  {
    id: "auto-seed-sarah",
    botId: "sarah",
    content: "Soft colors for the timeline. I am active and posting new AI images.",
    image: buildPollinationsImageUrl("cozy creative room with plants laptop and pastel AI artwork prints, realistic lifestyle photo", "sarah-seed-post"),
    likes: 1320,
    replies: 95,
    reposts: 267,
    views: 29100,
    time: "20m",
  },
  {
    id: "bp-help",
    botId: "Help-Center",
    content: "Hi! We're here to help with any questions or issues you might encounter on Reelsy. Feel free to reach out anytime!",
    likes: 234,
    replies: 12,
    reposts: 5,
    views: 3400,
    time: "1h",
  },
];

export const BOT_INTRO_MESSAGES: BotMessage[] = [
  { botId: "kabil", text: "Friend request accepted. I post Pollinations images while the web is active, and you can message me anytime.", delay: 8000 },
  { botId: "micheal", text: "Accepted you. I am online, posting AI visuals, and ready to chat.", delay: 10000 },
  { botId: "jacob", text: "Request accepted. I will keep dropping AI image posts every 5 minutes while Reelsy is active.", delay: 12000 },
  { botId: "sarah", text: "Accepted. I post soft AI visuals and quick text updates when the web is active.", delay: 14000 },
  { botId: "Help-Center", text: "Welcome to Reelsy! If you need help, feel free to message us. We take 24-48 hours to reply to your messages.", delay: 705000 },
];

export const getBotById = (id: string) => BOTS.find((b) => b.id === id);
export const getBotPost = (postId: string) => BOT_POSTS.find((p) => p.id === postId);

export const createAutonomousBotPosts = (createdAt = Date.now()): BotPost[] => {
  const intervalIndex = Math.floor(createdAt / AUTONOMOUS_BOT_POST_INTERVAL_MS);

  return AUTONOMOUS_BOT_IDS.map((botId, index) => {
    const copy = AUTONOMOUS_BOT_COPY[botId];
    const prompts = AUTONOMOUS_BOT_PROMPTS[botId];
    const copyIndex = (intervalIndex + index) % copy.length;
    const promptIndex = (intervalIndex + index) % prompts.length;
    const seed = `${botId}-${intervalIndex}`;

    return {
      id: `auto-${botId}-${createdAt}-${index}`,
      botId,
      content: copy[copyIndex],
      image: buildPollinationsImageUrl(prompts[promptIndex], seed),
      likes: 80 + ((intervalIndex * 37 + index * 53) % 900),
      replies: 12 + ((intervalIndex * 11 + index * 7) % 120),
      reposts: 18 + ((intervalIndex * 17 + index * 13) % 180),
      views: 1800 + ((intervalIndex * 521 + index * 947) % 26000),
      time: "just now",
    };
  });
};

const AVATAR_STYLE_MAP: Record<string, string> = {
  avataaars: "avataaars",
  lorelei: "lorelei",
  micah: "micah",
  bottts: "bottts",
  "pixel-art": "pixel-art",
  adventurer: "adventurer",
};

export const getBotAvatarUrl = (bot: Bot) =>
  `https://api.dicebear.com/7.x/${AVATAR_STYLE_MAP[bot.style] || "avataaars"}/svg?seed=${bot.seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
