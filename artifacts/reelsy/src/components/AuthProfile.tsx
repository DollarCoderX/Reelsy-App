import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { ChevronLeft, Camera, Check, AlertCircle, RotateCcw } from "lucide-react";
import AvatarCustomizer from "./AvatarCustomizer";

// Reserved usernames that can't be registered
const RESERVED_USERNAMES = new Set([
  "admin", "support", "help", "official", "reelsy", "whales", "bot", "info", "contact", "root", "system"
]);

const AvatarDisplay = ({ src, className }: { src: string; className: string }) =>
  src.startsWith("<") ? (
    <div dangerouslySetInnerHTML={{ __html: src }} className={className} />
  ) : (
    <img src={src} alt="avatar" className={`${className} object-cover`} />
  );

// Fallback suggestions when API isn't available
const fallbackSuggestions = (base: string): string[] => [
  `${base}${Math.floor(Math.random() * 999) + 1}`,
  `${base}_real`,
  `the_${base}`,
];

const AuthProfile = () => {
  const { setAppPhase, setUser, authEmail } = useAppContext();
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [avatar, setAvatar] = useState("");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  // Check username availability against real MongoDB via API (debounced 600ms)
  useEffect(() => {
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    const clean = username.trim().toLowerCase().replace(/^@/, "");
    if (!clean) { setIsAvailable(null); setSuggestions([]); return; }

    setIsChecking(true);
    checkTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/username-check?username=${encodeURIComponent(clean)}`);
        if (res.ok) {
          const data = await res.json();
          setIsAvailable(data.available);
          setSuggestions(data.suggestions || []);
        } else {
          // API not reachable — check reserved only
          setIsAvailable(!RESERVED_USERNAMES.has(clean));
          setSuggestions(RESERVED_USERNAMES.has(clean) ? fallbackSuggestions(clean) : []);
        }
      } catch {
        setIsAvailable(!RESERVED_USERNAMES.has(clean));
        setSuggestions(RESERVED_USERNAMES.has(clean) ? fallbackSuggestions(clean) : []);
      } finally {
        setIsChecking(false);
      }
    }, 600);
    return () => { if (checkTimerRef.current) clearTimeout(checkTimerRef.current); };
  }, [username]);

  const handleRefreshSuggestions = async () => {
    const clean = username.toLowerCase().replace(/^@/, "");
    try {
      const res = await fetch(`/api/users/username-check?username=${encodeURIComponent(clean)}`);
      if (res.ok) setSuggestions((await res.json()).suggestions || fallbackSuggestions(clean));
    } catch { setSuggestions(fallbackSuggestions(clean)); }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setUsername(suggestion);
  };

  const handleNext = () => {
    if (!username || !nickname || !age) return;
    if (isChecking) { showToast("Still checking username…"); return; }
    if (isAvailable !== true) {
      showToast("❌ Username is taken. Please choose another one.");
      return;
    }
    const ageNum = parseInt(age);
    setUser({ username: username.startsWith("@") ? username : `@${username}`, nickname, age: ageNum, avatar });
    setAppPhase("auth-interests");
  };

  const canProceed = !!username.trim() && !!nickname.trim() && !!age && isAvailable === true && !isChecking;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute inset-0 flex flex-col bg-background text-foreground"
      >
        <div className="shrink-0 px-4 pt-5">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAppPhase(authEmail ? "auth-password" : "auth-email")}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-none px-7 pt-5 pb-4">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-7">
            <h1 className="text-[26px] font-bold tracking-tight">Set up your profile</h1>
            <p className="mt-2 text-[13px] text-muted-foreground">This is how people will find you on Reelsy.</p>
          </motion.div>

          {/* Avatar picker */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.06 }}
            className="flex flex-col items-center mb-7 gap-2">
            <button onClick={() => setAvatarOpen(true)} className="relative">
              <div className="w-20 h-20 rounded-full bg-secondary overflow-hidden shadow-sm">
                {avatar
                  ? <AvatarDisplay src={avatar} className="w-full h-full" />
                  : <div className="w-full h-full flex items-center justify-center"><Camera className="w-6 h-6 text-muted-foreground/40" /></div>
                }
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 bg-foreground rounded-full flex items-center justify-center shadow-md">
                <Camera className="w-3 h-3 text-background" />
              </div>
            </button>
            <button onClick={() => setAvatarOpen(true)}
              className="text-[12px] font-semibold text-muted-foreground">
              {avatar ? "Change picture" : "Add a picture"}
            </button>
          </motion.div>

          {/* Fields */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12 }} className="space-y-3">
            
            {/* Username Input */}
            <div className="space-y-2.5">
              <div className="flex items-center h-[52px] bg-secondary rounded-2xl px-4 gap-1">
                <span className="text-muted-foreground font-semibold text-[14px]">@</span>
                <input 
                  type="text" 
                  placeholder="username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  className="flex-1 bg-transparent text-[14px] font-medium outline-none"
                />
              </div>

              {/* Status Message */}
              <AnimatePresence mode="wait">
                {username.trim() && (isChecking || isAvailable !== null) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex items-center gap-2 text-[12px] font-medium px-1 ${
                      isChecking ? "text-muted-foreground" : isAvailable ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {isChecking ? (
                      <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /><span>Checking…</span></>
                    ) : isAvailable ? (
                      <><Check className="w-4 h-4" /><span>Username available</span></>
                    ) : (
                      <><AlertCircle className="w-4 h-4" /><span>Username already taken</span></>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Suggestions */}
              <AnimatePresence>
                {isAvailable === false && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2.5"
                  >
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                        Try these instead
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleRefreshSuggestions}
                        className="w-6 h-6 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
                        title="Refresh suggestions"
                      >
                        <RotateCcw className="w-3 h-3 text-muted-foreground" />
                      </motion.button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion, idx) => (
                        <motion.button
                          key={`${suggestion}-${idx}`}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSelectSuggestion(suggestion)}
                          className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-full text-[12px] font-semibold text-foreground transition-colors cursor-pointer border border-secondary hover:border-foreground/20"
                        >
                          @{suggestion}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <input type="text" placeholder="Display name" value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full h-[52px] px-4 bg-secondary rounded-2xl text-[14px] font-medium outline-none" />
            <input type="number" placeholder="Age" value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full h-[52px] px-4 bg-secondary rounded-2xl text-[14px] font-medium outline-none" />
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }} className="shrink-0 px-7 pb-10 pt-4">
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleNext} disabled={!canProceed}
            className="w-full py-4 rounded-full bg-foreground text-background font-semibold text-[15px] shadow-sm disabled:opacity-40 transition-opacity">
            Continue
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-foreground text-background px-5 py-2.5 rounded-full text-[12px] font-medium shadow-lg z-40 whitespace-nowrap">
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {avatarOpen && (
          <AvatarCustomizer
            onClose={() => setAvatarOpen(false)}
            onSave={(url) => { setAvatar(url); setAvatarOpen(false); }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default AuthProfile;
