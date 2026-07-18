/**
 * FeatureDetailSheet — full-screen explainer shown when the user taps "Learn more"
 * in FeatureIntroSheet. Shows rich visuals + bullet points for each feature.
 */
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Star, Users, Zap, Shield, Heart, Video, Bell, Search, Lock, Sparkles } from "lucide-react";

interface Feature {
  icon: React.ReactNode;
  color: string;
  title: string;
  tagline: string;
  bullets: { icon: React.ReactNode; text: string }[];
}

// Map feature titles (lowercased) → rich content
function getFeatureContent(title: string, description: string): Feature {
  const t = title.toLowerCase();

  if (t.includes("sticker") || t.includes("emoji")) {
    return {
      icon: <Star className="w-8 h-8" />,
      color: "from-violet-500 to-pink-500",
      title: "Stickers & Emojis",
      tagline: "Express yourself beyond words",
      bullets: [
        { icon: <Sparkles className="w-4 h-4 text-violet-400" />, text: "Send animated mood stickers built from your custom avatar" },
        { icon: <Star className="w-4 h-4 text-pink-400" />, text: "Browse 100+ themed sticker packs curated for every moment" },
        { icon: <Heart className="w-4 h-4 text-rose-400" />, text: "React to messages with emoji bursts instead of typing" },
        { icon: <Zap className="w-4 h-4 text-amber-400" />, text: "Your Bitmoji avatar appears with 16 different mood poses" },
      ],
    };
  }
  if (t.includes("message") || t.includes("dm") || t.includes("chat")) {
    return {
      icon: <MessageCircle className="w-8 h-8" />,
      color: "from-blue-500 to-cyan-500",
      title: "Direct Messages",
      tagline: "Private conversations, your way",
      bullets: [
        { icon: <Zap className="w-4 h-4 text-blue-400" />, text: "Real-time messaging powered by Supabase — no refresh needed" },
        { icon: <Users className="w-4 h-4 text-cyan-400" />, text: "Find friends by username or phone number to start a chat" },
        { icon: <Star className="w-4 h-4 text-violet-400" />, text: "Send stickers, photos, and videos directly in any conversation" },
        { icon: <Shield className="w-4 h-4 text-green-400" />, text: "Control who can message you — everyone or friends only" },
      ],
    };
  }
  if (t.includes("friend") || t.includes("follow")) {
    return {
      icon: <Users className="w-8 h-8" />,
      color: "from-green-500 to-teal-500",
      title: "Friends & Followers",
      tagline: "Your circle, your rules",
      bullets: [
        { icon: <Users className="w-4 h-4 text-green-400" />, text: "Send friend requests or set your profile to open for instant follows" },
        { icon: <Search className="w-4 h-4 text-teal-400" />, text: "Discover people by username, phone number, or recommendations" },
        { icon: <Bell className="w-4 h-4 text-amber-400" />, text: "Get notified instantly when someone accepts your request" },
        { icon: <Shield className="w-4 h-4 text-blue-400" />, text: "Block or remove connections at any time with one tap" },
      ],
    };
  }
  if (t.includes("video") || t.includes("reel") || t.includes("post")) {
    return {
      icon: <Video className="w-8 h-8" />,
      color: "from-rose-500 to-orange-500",
      title: "Posts & Videos",
      tagline: "Share your world in full motion",
      bullets: [
        { icon: <Video className="w-4 h-4 text-rose-400" />, text: "Upload videos, images, or write text posts directly from your camera roll" },
        { icon: <Zap className="w-4 h-4 text-orange-400" />, text: "Your posts appear instantly on the For You feed for everyone to discover" },
        { icon: <Heart className="w-4 h-4 text-pink-400" />, text: "Like, comment, and reshare posts — earn engagement from the community" },
        { icon: <Star className="w-4 h-4 text-amber-400" />, text: "Save posts to your personal collection and revisit them anytime" },
      ],
    };
  }
  if (t.includes("notif")) {
    return {
      icon: <Bell className="w-8 h-8" />,
      color: "from-amber-500 to-orange-500",
      title: "Notifications",
      tagline: "Never miss a moment",
      bullets: [
        { icon: <Heart className="w-4 h-4 text-rose-400" />, text: "Get real-time alerts when someone likes or comments on your posts" },
        { icon: <Users className="w-4 h-4 text-blue-400" />, text: "See friend requests and follows the moment they happen" },
        { icon: <MessageCircle className="w-4 h-4 text-violet-400" />, text: "New DM badge updates live — no reload needed" },
        { icon: <Zap className="w-4 h-4 text-amber-400" />, text: "All notifications stay in your bell tray for up to 30 days" },
      ],
    };
  }
  if (t.includes("privac") || t.includes("secur")) {
    return {
      icon: <Shield className="w-8 h-8" />,
      color: "from-slate-500 to-blue-500",
      title: "Privacy & Security",
      tagline: "You're in control",
      bullets: [
        { icon: <Lock className="w-4 h-4 text-slate-400" />, text: "Set your profile to private — friends-only can see your posts" },
        { icon: <Shield className="w-4 h-4 text-blue-400" />, text: "Block, report, and mute anyone in just two taps" },
        { icon: <Zap className="w-4 h-4 text-green-400" />, text: "Your messages are stored securely — never read by third parties" },
        { icon: <Users className="w-4 h-4 text-violet-400" />, text: "Control who can message you independently of your follow settings" },
      ],
    };
  }

  // Generic fallback
  return {
    icon: <Sparkles className="w-8 h-8" />,
    color: "from-violet-500 to-pink-500",
    title,
    tagline: description.slice(0, 60) + (description.length > 60 ? "…" : ""),
    bullets: description
      .split(/\.|;/)
      .filter((s) => s.trim().length > 10)
      .slice(0, 4)
      .map((s) => ({ icon: <Zap className="w-4 h-4 text-violet-400" />, text: s.trim() })),
  };
}

interface FeatureDetailSheetProps {
  open: boolean;
  featureTitle: string;
  featureDescription: string;
  onClose: () => void;
}

export default function FeatureDetailSheet({ open, featureTitle, featureDescription, onClose }: FeatureDetailSheetProps) {
  const feature = getFeatureContent(featureTitle, featureDescription);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-[140] bg-background rounded-t-[32px] overflow-hidden"
            style={{ maxHeight: "88%" }}
          >
            {/* Gradient hero banner */}
            <div className={`bg-gradient-to-br ${feature.color} px-6 pt-8 pb-10 relative`}>
              <motion.button
                whileTap={{ scale: 0.9 }} onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </motion.button>
              <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center text-white mb-4">
                {feature.icon}
              </div>
              <p className="text-white font-bold text-[22px] leading-tight">{feature.title}</p>
              <p className="text-white/80 text-[14px] mt-1">{feature.tagline}</p>
            </div>

            {/* Content */}
            <div className="px-6 pt-6 pb-10 overflow-y-auto" style={{ maxHeight: "55vh" }}>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-6">{featureDescription}</p>

              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">What you get</p>
              <div className="space-y-4">
                {feature.bullets.map((b, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-7 h-7 rounded-xl bg-secondary/60 flex items-center justify-center shrink-0 mt-0.5">
                      {b.icon}
                    </div>
                    <p className="text-[13px] leading-snug pt-1">{b.text}</p>
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }} onClick={onClose}
                className={`w-full mt-8 py-4 rounded-full bg-gradient-to-r ${feature.color} text-white font-bold text-[14px]`}
              >
                Got it!
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
