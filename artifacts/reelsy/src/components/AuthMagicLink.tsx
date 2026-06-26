import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { ChevronLeft, MoreHorizontal, X, Mail, RefreshCw } from "lucide-react";

const AuthMagicLink = () => {
  const { setAppPhase, authEmail, theme } = useAppContext();
  const [helpOpen, setHelpOpen] = useState(false);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  // Check URL for verification token on mount and on focus
  useEffect(() => {
    const checkToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("magic") || params.get("magic_token");
      if (!token) return;

      try {
        const res = await fetch(`/api/auth/verify-magic-link?token=${encodeURIComponent(token)}`);
        if (res.ok) {
          // Clear token from URL
          const url = new URL(window.location.href);
          url.searchParams.delete("magic_token");
          window.history.replaceState({}, "", url.toString());
          // Continue to password step
          setAppPhase("auth-password");
        }
      } catch { /* ignore */ }
    };

    checkToken();
    window.addEventListener("focus", checkToken);
    return () => window.removeEventListener("focus", checkToken);
  }, [setAppPhase]);

  const handleResend = async () => {
    if (resending || !authEmail) return;
    setResending(true);
    try {
      const appUrl = window.location.origin;
      await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, appUrl }),
      });
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch { /* ignore */ } finally {
      setResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 flex flex-col bg-background text-foreground"
    >
      {/* Header */}
      <div className="shrink-0 px-4 pt-5 flex items-center justify-between">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAppPhase("auth-email")}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setHelpOpen(true)}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <MoreHorizontal className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* Main content — blank with loading indicator */}
      <div className="flex-1 flex flex-col items-center justify-center px-7 gap-6">
        {/* Pulsing mail animation */}
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center"
        >
          <Mail className="w-9 h-9 text-foreground" strokeWidth={1.5} />
        </motion.div>

        {/* Animated dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
              className="w-2 h-2 rounded-full bg-foreground"
            />
          ))}
        </div>

        <p className="text-[13px] text-muted-foreground text-center">
          Waiting for verification…
          {authEmail && (
            <><br /><span className="text-foreground font-medium">{authEmail}</span></>
          )}
        </p>

        <button onClick={handleResend} disabled={resending}
          className="flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
          {resent ? "Link resent!" : "Resend link"}
        </button>
      </div>

      {/* Help sheet */}
      <AnimatePresence>
        {helpOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setHelpOpen(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="absolute bottom-0 left-0 right-0 z-50 bg-background rounded-t-[28px] px-5 pt-5 pb-10">
              <div className="flex items-center justify-between mb-5">
                <p className="font-bold text-[16px]">Verification Help</p>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setHelpOpen(false)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              </div>
              <div className="space-y-4 text-[13px] text-muted-foreground leading-relaxed">
                <div className="bg-secondary/50 rounded-2xl p-4">
                  <p className="font-semibold text-foreground mb-1">📧 Check your inbox</p>
                  <p>We sent a verification link to your email. Open it on any device to continue.</p>
                </div>
                <div className="bg-secondary/50 rounded-2xl p-4">
                  <p className="font-semibold text-foreground mb-1">⏱️ Link expires in 30 minutes</p>
                  <p>If the link expired, tap "Resend link" to get a new one.</p>
                </div>
                <div className="bg-secondary/50 rounded-2xl p-4">
                  <p className="font-semibold text-foreground mb-1">📁 Check spam/junk folder</p>
                  <p>Sometimes verification emails end up in spam. Mark it as "Not spam" if found.</p>
                </div>
                <div className="bg-secondary/50 rounded-2xl p-4">
                  <p className="font-semibold text-foreground mb-1">🔗 Clicking the link</p>
                  <p>Tap the link in the email. It will open Reelsy and automatically verify your account.</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AuthMagicLink;
