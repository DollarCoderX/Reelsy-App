import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { ChevronLeft, Loader2, Mail, CheckCircle2 } from "lucide-react";

const AuthForgotPassword = () => {
  const { setAppPhase } = useAppContext();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSend = async () => {
    if (!isValidEmail(email) || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to send reset email");
      }
    } catch {
      showToast("Something went wrong, try again");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute inset-0 flex flex-col bg-background text-foreground"
    >
      <div className="shrink-0 px-4 pt-5">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAppPhase("auth-login")}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-7 py-4 min-h-0">
        {sent ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center gap-5">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold mb-2">Check your email</h1>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                We sent a password reset link to<br />
                <strong className="text-foreground">{email}</strong>
              </p>
            </div>
            <button onClick={() => setAppPhase("auth-login")}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              Back to sign in
            </button>
          </motion.div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }} className="mb-7">
              <h1 className="text-[24px] font-bold tracking-tight leading-tight">Reset password</h1>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Enter your email and we'll send a reset link
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Mail className="w-5 h-5" />
                </div>
                <input type="email" placeholder="Your email address" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  autoFocus style={{ fontSize: 16 }}
                  className="w-full h-[52px] pl-12 pr-4 bg-secondary rounded-2xl font-medium outline-none" />
              </div>
            </motion.div>
          </>
        )}
      </div>

      {!sent && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16 }}
          className="shrink-0 px-7 pb-8 pt-4">
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleSend}
            disabled={!isValidEmail(email) || isLoading}
            className="w-full py-4 rounded-full font-semibold text-[15px] shadow-sm disabled:opacity-40 flex items-center justify-center gap-2 bg-foreground text-background">
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</> : "Send reset link"}
          </motion.button>
        </motion.div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-foreground text-background px-5 py-2.5 rounded-full text-[12px] font-medium shadow-lg z-40 whitespace-nowrap">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AuthForgotPassword;
