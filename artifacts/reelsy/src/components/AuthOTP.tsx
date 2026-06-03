import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { ChevronLeft, Loader2, Mail, X } from "lucide-react";

const AuthOTP = () => {
  const { setAppPhase, authEmail } = useAppContext();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [timeLeft]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const handleChange = async (idx: number, val: string) => {
    const digit = val.replace(/[^A-Za-z0-9]/g, "").slice(-1).toUpperCase();
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
    if (next.every((d) => d !== "")) {
      setIsLoading(true);
      try {
        const code = next.join("");
        const res = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: authEmail, code })
        });
        
        if (!res.ok) {
          throw new Error("Invalid or expired code");
        }
        
        setAppPhase("auth-password");
      } catch (err) {
        showToast("Invalid or expired code");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (otp[idx] === "" && idx > 0) {
        const next = [...otp];
        next[idx - 1] = "";
        setOtp(next);
        inputRefs.current[idx - 1]?.focus();
      } else {
        const next = [...otp];
        next[idx] = "";
        setOtp(next);
      }
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute inset-0 flex flex-col bg-background text-foreground"
      >
        <div className="shrink-0 px-4 pt-5">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAppPhase("auth-email")}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-none px-7 pt-6 pb-4">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
            <h1 className="text-[26px] font-bold tracking-tight">Enter the code</h1>
            <p className="mt-2 text-[13px] text-muted-foreground">Sent to your email</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="flex justify-between gap-2 mb-8">
            {otp.map((digit, i) => (
              <motion.input key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text" maxLength={1}
                value={digit} onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)} disabled={isLoading}
                style={{ fontSize: 18, touchAction: "manipulation" }}
                animate={{
                  scale: digit ? 1.04 : 1,
                  backgroundColor: digit ? "hsl(var(--foreground))" : "hsl(var(--secondary))",
                  color: digit ? "hsl(var(--background))" : "hsl(var(--foreground))",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="flex-1 aspect-square min-w-0 text-center font-bold rounded-xl outline-none"
              />
            ))}
          </motion.div>

          <div className="flex justify-center">
            <button disabled={timeLeft > 0 || isLoading} onClick={() => setSheetOpen(true)}
              className="text-[13px] font-medium text-foreground disabled:text-muted-foreground transition-colors">
              {timeLeft > 0 ? `Resend in 0:${timeLeft.toString().padStart(2, "0")}` : "Resend code"}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
              <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }}
                className="bg-foreground text-background px-7 py-4 rounded-3xl flex items-center gap-3 shadow-2xl">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-semibold text-[14px]">Verifying...</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-foreground text-background px-5 py-2.5 rounded-full text-[12px] font-medium shadow-lg z-40 whitespace-nowrap">
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Resend sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setSheetOpen(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="absolute bottom-0 left-0 right-0 z-50 bg-background rounded-t-[28px] px-5 pt-4 pb-10">
              <div className="flex items-center justify-between mb-5">
                <p className="font-bold text-[15px]">How would you like the code?</p>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSheetOpen(false)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              </div>
              <div className="space-y-2">
                {[{ icon: Mail, label: "Resend email" }].map((opt) => (
                  <motion.button key={opt.label} whileTap={{ scale: 0.97 }}
                    onClick={async () => { 
                      setSheetOpen(false); 
                      setTimeLeft(45); 
                      try {
                        await fetch("/api/auth/send-otp", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: authEmail })
                        });
                        showToast(`Code sent to your email`);
                      } catch {
                        showToast("Failed to resend");
                      }
                    }}
                    className="w-full flex items-center gap-3.5 p-4 rounded-2xl bg-secondary text-[14px] font-medium">
                    <div className="w-9 h-9 rounded-xl bg-background flex items-center justify-center">
                      <opt.icon className="w-4 h-4" />
                    </div>
                    {opt.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AuthOTP;
