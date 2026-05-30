import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark,
  Check,
  ChevronLeft,
  Flag,
  Heart,
  Mail,
  MessageCircle,
  MoreVertical,
  Play,
  Share2,
  UserX,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Bot } from "@/data/bots";
import {
  acceptBotFriendRequest,
  getBotAvatarUrl,
  isAutonomousBotId,
  readFriendBotIds,
} from "@/data/bots";

interface UserProfileProps {
  bot: Bot | null;
  onClose: () => void;
  onChat: (bot: Bot) => void;
}

type FriendStatus = "none" | "requested" | "friends";
type ProfileTab = "posts" | "replies" | "media" | "likes";

const GRID_IMAGES = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&auto=format&fit=crop",
];

const BOT_COVERS = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&auto=format&fit=crop",
];

const profilePostText = (name: string, role: string) =>
  `${role} is not just a title. It is how ${name.split(" ")[0]} notices small details, builds a point of view, and turns simple ideas into something people can feel.`;

const coverForBot = (id: string) => {
  const index = id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % BOT_COVERS.length;
  return BOT_COVERS[index];
};

const UserProfile = ({ bot, onClose, onChat }: UserProfileProps) => {
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!bot) return;
    setFriendStatus(readFriendBotIds().includes(bot.id) ? "friends" : "none");
  }, [bot?.id]);

  if (!bot) return null;

  const avatarUrl = getBotAvatarUrl(bot);
  const coverUrl = coverForBot(bot.id);

  const handleFriendAction = () => {
    if (friendStatus === "none" && isAutonomousBotId(bot.id)) {
      acceptBotFriendRequest(bot.id);
      setFriendStatus("friends");
    } else if (friendStatus === "none") {
      setFriendStatus("requested");
    } else if (friendStatus === "requested") {
      setFriendStatus("none");
    }
  };

  const friendLabel = friendStatus === "friends" ? "Friends" : friendStatus === "requested" ? "Requested" : "Befriend";
  const FriendIcon = friendStatus === "friends" ? Users : UserPlus;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] bg-background"
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 330, damping: 34 }}
          className="absolute inset-0 flex flex-col overflow-hidden bg-background text-foreground"
        >
          <div className="relative h-[236px] shrink-0 overflow-visible bg-background">
            <div
              className="absolute inset-0 overflow-hidden bg-secondary"
              style={{
                backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.04), hsl(var(--background) / 0.18) 48%, hsl(var(--background) / 0.82)), url(${coverUrl}), linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--muted)))`,
                backgroundSize: "cover, cover, cover",
                backgroundPosition: "center",
              }}
            />
            <div className="absolute left-4 right-4 top-5 flex items-center justify-between">
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-background/40 bg-background/75 text-foreground shadow-sm backdrop-blur-md"
                aria-label="Back"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="relative">
              <button
                onClick={() => setMenuOpen((value) => !value)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-background/40 bg-background/70 text-foreground shadow-sm backdrop-blur-md"
                aria-label="More"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.94, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, y: -6 }}
                      className="absolute right-0 top-12 z-20 w-52 overflow-hidden rounded-2xl border border-secondary bg-background shadow-2xl"
                    >
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(`https://reelsy.app/user/${bot.id}`).catch(() => {});
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-semibold"
                      >
                        <Share2 className="h-4 w-4 text-muted-foreground" />
                        Share profile
                      </button>
                      <button
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-3 border-t border-secondary/60 px-4 py-3 text-left text-[13px] font-semibold"
                      >
                        <Flag className="h-4 w-4 text-muted-foreground" />
                        Report profile
                      </button>
                      <button
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-3 border-t border-secondary/60 px-4 py-3 text-left text-[13px] font-semibold text-rose-500"
                      >
                        <UserX className="h-4 w-4" />
                        Block user
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
              </div>
            </div>
            <div className="absolute bottom-0 left-5 z-10 translate-y-1/2">
              <div className="h-[82px] w-[82px] overflow-hidden rounded-[26px] border-[4px] border-background bg-secondary shadow-xl">
                <img src={avatarUrl} alt={bot.name} className="h-full w-full object-cover" />
              </div>
            </div>
            <div className="absolute bottom-0 right-5 z-10 flex translate-y-1/2 items-center gap-2">
              <button
                onClick={() => onChat(bot)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground shadow-sm"
                aria-label={`Message ${bot.name}`}
              >
                <Mail className="h-4 w-4" />
              </button>
              <button
                onClick={handleFriendAction}
                className={`flex h-10 items-center gap-1.5 rounded-full px-5 text-[12px] font-bold shadow-sm ${
                  friendStatus === "friends" || friendStatus === "requested"
                    ? "bg-secondary text-foreground"
                    : "bg-foreground text-background"
                }`}
              >
                <FriendIcon className="h-3.5 w-3.5" />
                {friendLabel}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-none bg-background">
            <div className="px-5 pb-8 pt-14">
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-[20px] font-bold tracking-tight">{bot.name}</h2>
                  {bot.verified && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="text-[12px] font-medium text-muted-foreground">{bot.handle}</p>
              </div>

              <div className="mt-3 flex items-center gap-4 text-[13px]">
                <p><span className="font-bold">{bot.following}</span> Friends</p>
                <p><span className="font-bold">{bot.followers}</span> Posts</p>
              </div>

              <p className="mt-3 max-w-[310px] text-[13px] leading-relaxed">{bot.bio}</p>

              <div className="mt-5 flex border-b border-secondary/80">
                {(["posts", "replies", "media", "likes"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 pb-3 text-[13px] font-bold capitalize transition-colors ${
                      activeTab === tab ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === "posts" || activeTab === "replies" ? (
                <div className="border-b border-secondary/70 py-4">
                  <div className="flex gap-3">
                    <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full bg-secondary object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[13px] font-bold">{bot.name}</p>
                          <p className="text-[11px] text-muted-foreground">{bot.handle} - {bot.role}</p>
                        </div>
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="mt-2 text-[12px] leading-relaxed text-foreground/85">
                        {profilePostText(bot.name, bot.role)}
                      </p>
                      <div className="mt-3 flex items-center gap-5 text-muted-foreground">
                        <span className="flex items-center gap-1 text-[11px]"><MessageCircle className="h-3.5 w-3.5" /> 24</span>
                        <span className="flex items-center gap-1 text-[11px]"><Heart className="h-3.5 w-3.5" /> 1.2K</span>
                        <span className="flex items-center gap-1 text-[11px]"><Bookmark className="h-3.5 w-3.5" /> Save</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 py-4">
                  {GRID_IMAGES.map((img, index) => (
                    <div key={img} className="relative aspect-square overflow-hidden rounded-sm bg-secondary">
                      <img src={img} alt="" className="h-full w-full object-cover" />
                      {index === 2 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <Play className="h-6 w-6 fill-white text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UserProfile;
