import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, Heart, MessageCircle, Repeat2, UserCheck } from "lucide-react";
import { AppNotification } from "@/lib/api";
import { useNotifications } from "@/context/NotificationContext";
import { LottieEmoji } from "./LottieEmoji";

const TYPE_ICON: Record<AppNotification["type"], React.ReactNode> = {
  like: <LottieEmoji emoji="❤️" size={18} />,
  comment: <LottieEmoji emoji="💬" size={18} />,
  reshare: <Repeat2 className="w-4 h-4 text-green-500" />,
  save: <LottieEmoji emoji="🔖" size={18} />,
  friend_request: <UserPlus className="w-4 h-4 text-blue-500" />,
  friend_accepted: <UserCheck className="w-4 h-4 text-violet-500" />,
  profile_view: <LottieEmoji emoji="👀" size={18} />,
};

const TYPE_TEXT: Record<AppNotification["type"], string> = {
  like: "liked your post",
  comment: "commented on your post",
  reshare: "reshared your post",
  save: "saved your post",
  friend_request: "sent you a friend request",
  friend_accepted: "accepted your friend request",
  profile_view: "viewed your profile",
};

export const NotificationToast = () => {
  const { toasts, dismissToast } = useNotifications();

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast._id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-background/95 backdrop-blur-md border border-secondary/80 shadow-lg"
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="w-9 h-9 rounded-full bg-secondary overflow-hidden flex items-center justify-center text-[13px] font-bold"
                style={{
                  backgroundImage: toast.fromProfileImage
                    ? `url(${toast.fromProfileImage})`
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {!toast.fromProfileImage &&
                  (toast.fromDisplayName?.[0] || toast.fromUsername?.[0] || "?")}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-background flex items-center justify-center border border-secondary/60">
                {TYPE_ICON[toast.type]}
              </div>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold truncate">
                {toast.fromDisplayName || toast.fromUsername}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {TYPE_TEXT[toast.type]}
              </p>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => dismissToast(toast._id)}
              className="shrink-0 p-1 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationToast;
