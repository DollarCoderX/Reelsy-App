import { useState } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { Facebook, Instagram, Linkedin, Megaphone, Youtube, Users, MoreHorizontal, Moon, Sun, ChevronLeft } from "lucide-react";

interface DiscoverOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }> | ((props: { className?: string }) => React.ReactNode);
}

const DISCOVER_OPTIONS: DiscoverOption[] = [
  { id: "facebook", label: "Facebook", icon: Facebook },
  {
    id: "tiktok",
    label: "TikTok",
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.94-1.74-.22-.23-.45-.48-.64-.73v6.52c-.07 4.14-3.04 7.82-7.14 8.27-3.95.5-8.09-1.85-9.15-5.75C.42 12.44 2.82 7.7 7.03 6.97c1.08-.22 2.23-.1 3.24.28v4.17c-.89-.48-1.95-.56-2.9-.21-1.57.51-2.65 2.24-2.39 3.9.3 2.1 2.44 3.49 4.5 2.99 1.48-.3 2.45-1.79 2.44-3.3V.02z"/>
      </svg>
    )
  },
  {
    id: "discord",
    label: "Discord",
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/>
      </svg>
    )
  },
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin },
  { id: "event", label: "Conference / Live event", icon: Megaphone },
  {
    id: "reddit",
    label: "Reddit",
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 11.5c0-1.65-1.35-3-3-3-.96 0-1.86.48-2.42 1.24-1.64-1-3.85-1.64-6.23-1.72l1.3-4.1 4.2.9c.04.94.82 1.7 1.8 1.7 1.1 0 2-.9 2-2s-.9-2-2-2c-.84 0-1.56.52-1.86 1.26l-4.7-1c-.18-.04-.37.07-.43.25l-1.5 4.7c-2.48.04-4.77.68-6.47 1.72-.56-.76-1.46-1.24-2.42-1.24-1.65 0-3 1.35-3 3 0 1.2.7 2.23 1.72 2.72-.08.35-.12.72-.12 1.1 0 3.86 4.48 7 10 7s10-3.14 10-7c0-.38-.04-.75-.12-1.1 1.02-.5 1.72-1.5 1.72-2.72zm-17.5 1c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm11 4.5c-1.82 1.82-5.18 1.82-7 0-.19-.19-.19-.52 0-.71.2-.2.51-.2.71 0 1.43 1.43 4.15 1.43 5.58 0 .2-.2.51-.2.71 0 .19.19.19.52 0 .71zm-.5-4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
      </svg>
    )
  },
  { id: "youtube", label: "YouTube", icon: Youtube },
  {
    id: "chatgpt",
    label: "ChatGPT / Claude...",
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    )
  },
  {
    id: "x",
    label: "X",
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    )
  },
  { id: "friends", label: "Teammates / Friends", icon: Users },
  {
    id: "google",
    label: "Google",
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.111 4.113-3.418 0-6.19-2.772-6.19-6.19 0-3.418 2.772-6.19 6.19-6.19 1.517 0 2.9.544 3.978 1.45l3.18-3.18C19.1 1.954 15.894 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.48 0 10.74-4.54 10.74-10.9 0-.74-.08-1.3-.2-1.795H12.24z"/>
      </svg>
    )
  },
  { id: "other", label: "Other", icon: MoreHorizontal },
];

const AuthDiscover = () => {
  const { setAppPhase, user, setUser, theme, setTheme } = useAppContext();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (user) {
      setUser({ ...user, discoverSource: selected } as any);
    }
    setAppPhase("auth-friends");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute inset-0 flex flex-col bg-background text-foreground"
    >
      {/* Header and Theme Toggle */}
      <div className="shrink-0 px-7 pt-6 flex justify-between items-center">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setAppPhase("auth-interests")}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-foreground"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-foreground"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </motion.button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto overscroll-none px-7 pt-5 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-[26px] font-bold tracking-tight">How did you discover us?</h1>
        </motion.div>

        {/* Option Pills */}
        <div className="flex flex-wrap gap-2.5">
          {DISCOVER_OPTIONS.map((option, i) => {
            const isSelected = selected.includes(option.id);
            const Icon = option.icon;

            return (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 350,
                  damping: 24,
                  delay: i * 0.02,
                }}
                whileTap={{ scale: 0.94 }}
                onClick={() => toggle(option.id)}
                className={`flex items-center gap-2 px-4.5 py-2.5 rounded-full text-[13px] font-semibold transition-all border ${
                  isSelected
                    ? "bg-foreground border-foreground text-background"
                    : "bg-secondary/40 border-secondary/80 hover:border-foreground/20 text-foreground"
                }`}
              >
                <span className={`shrink-0 ${isSelected ? "text-background" : "text-foreground/75"}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span>{option.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Bottom Actions */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="shrink-0 px-7 pb-10 pt-4 flex items-center justify-between gap-4"
      >
        <button
          onClick={() => setAppPhase("auth-interests")}
          className="py-3 text-[14px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Back
        </button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleNext}
          className="px-8 py-3.5 rounded-full bg-foreground text-background font-semibold text-[15px] shadow-sm disabled:opacity-40 transition-opacity"
        >
          Next
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default AuthDiscover;
