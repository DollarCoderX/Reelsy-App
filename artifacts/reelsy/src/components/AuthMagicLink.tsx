import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { ChevronLeft, MoreHorizontal, X, Mail, RefreshCw, AlertCircle } from "lucide-react";

const AuthMagicLink = () => {
  const { setAppPhase, setUser, authEmail, theme } = useAppContext();
  const [helpOpen, setHelpOpen] = useState(false);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyToken = async (token: string) => {
    if (verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/verify-magic-link?token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.token) localStorage.setItem("authToken", data.token);
        if (data.user) {
          const userObj = {
            username: data.user.username,
            nickname: data.user.displayName || data.user.username,
            email: data.user.email,
            avatar: data.user.profileImage || undefined,
            age: data.user.age,
            interests: data.user.interests || [],
            tier: data.user.tier || "free",
          };
          setUser(userObj);
          localStorage.setItem("reelsy_user", JSON.stringify(userObj));
          if (data.user.supabaseId) localStorage.setItem("supabaseId", data.user.supabaseId);
        }
        setAppPhase("main");
      } else {
        const body = await res.json().catch(() => ({}));
        if (body.error === "INVALID_OR_EXPIRED_LINK" || res.status === 401) {
          setError("This link has expired or already been used. Tap below to get a new one.");
        } else if (body.error === "USER_NOT_FOUND") {
          setError("No account found for this email. Please sign up first.");
        } else {
          setError("Verification failed. Please try again.");
        }
      }
    } catch {
      setError("Connection error. Please check your network and try again.");
    } finally {
      setVerifying(false);
    }
  };

  // Check URL + sessionStorage on mount and window focus
  useEffect(() => {
    const checkToken = () => {
      const params = new URLSearchParams(window.location.search);
      const token =
        params.get("magic") ||
        params.get("magic_token") ||
        sessionStorage.getItem("reelsy_pending_magic_token");
      if (!token) return;

      // Consume immediately so we don't verify twice
      sessionStorage.removeItem("reelsy_pending_magic_token");
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("magic");
      cleanUrl.searchParams.delete("magic_token");
      window.history.replaceState({}, "", cleanUrl.toString());

      verifyToken(token);
    };

    checkToken();
    window.addEventListener("focus", checkToken);
    return () => window.removeEventListener("focus", checkToken);
  }, []);

  const handleResend = async () => {
    if (resending || !authEmail) return;
    setResending(true);
    setError(null);
    try {
      await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail }),
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

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center px-7 gap-6">
        {error ? (
          /* Error state */
          <>
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              className="w-20 h-20 rounded-full bg-rose-500/15 flex items-center justify-center">
              <AlertCircle className="w-9 h-9 text-rose-500" strokeWidth={1.5} />
            </motion.div>
            <div className="text-center space-y-2">
              <p className="text-[16px] font-bold">Link Problem</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{error}</p>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleResend} disabled={resending || !authEmail}
              className="px-6 py-3 rounded-full bg-foreground text-background font-bold text-[14px] flex items-center gap-2 disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
              {resent ? "New link sent!" : "Send new link"}
            </motion.button>
          </>
        ) : verifying ? (
          /* Verifying state */
          <>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-full border-2 border-foreground/20 border-t-foreground" />
            <p className="text-[14px] text-muted-foreground">Verifying link…</p>
          </>
        ) : (
          /* Waiting state */
          <>
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
              <Mail className="w-9 h-9 text-foreground" strokeWidth={1.5} />
            </motion.div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <motion.div key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                  className="w-2 h-2 rounded-full bg-foreground" />
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
          </>
        )}
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
              <div className="space-y-3 text-[13px] text-muted-foreground leading-relaxed">
                <div className="bg-secondary/50 rounded-2xl p-4">
                  <p className="font-semibold text-foreground mb-1">📧 Check your inbox</p>
                  <p>Open the Reelsy link on any device — it works even on a different phone or computer.</p>
                </div>
                <div className="bg-secondary/50 rounded-2xl p-4">
                  <p className="font-semibold text-foreground mb-1">⏱️ Link expires in 30 minutes</p>
                  <p>Request a new link if yours expired. Each link is single-use.</p>
                </div>
                <div className="bg-secondary/50 rounded-2xl p-4">
                  <p className="font-semibold text-foreground mb-1">📁 Check spam / junk</p>
                  <p>Sometimes verification emails land there. Mark it "Not spam" if so.</p>
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
