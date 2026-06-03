import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { Check, ChevronLeft, Eye, EyeOff, Lock } from "lucide-react";

const AuthPassword = () => {
  const { setAppPhase, setAuthPassword } = useAppContext();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const checks = useMemo(() => [
    { label: "8 characters", met: password.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Number", met: /\d/.test(password) },
    { label: "Special character", met: /[^A-Za-z0-9]/.test(password) },
  ], [password]);

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isStrongPassword = checks.every((check) => check.met);
  const canProceed = isStrongPassword && passwordsMatch;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute inset-0 flex flex-col bg-background text-foreground"
    >
      <div className="shrink-0 px-4 pt-5">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAppPhase("auth-otp")}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-7 py-4 min-h-0">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }} className="mb-7">
          <h1 className="text-[24px] font-bold tracking-tight leading-tight">
            Create a password
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Use a strong password to keep your Reelsy account secure.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }} className="space-y-3">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              style={{ fontSize: 16 }}
              className="w-full h-[52px] pl-12 pr-12 bg-secondary rounded-2xl font-medium outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ fontSize: 16 }}
              className="w-full h-[52px] pl-12 pr-12 bg-secondary rounded-2xl font-medium outline-none"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="pt-2 grid grid-cols-2 gap-2">
            {checks.map((check) => (
              <div key={check.label}
                className={`flex items-center gap-2 text-[12px] font-medium ${check.met ? "text-green-500" : "text-muted-foreground"}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center ${check.met ? "bg-green-500 text-white" : "bg-secondary"}`}>
                  {check.met && <Check className="w-3 h-3" strokeWidth={3} />}
                </span>
                <span>{check.label}</span>
              </div>
            ))}
          </div>

          <div className={`h-5 text-[12px] font-medium px-1 ${passwordsMatch ? "text-green-500" : "text-muted-foreground"}`}>
            {confirmPassword ? (passwordsMatch ? "Passwords match" : "Passwords do not match") : ""}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16 }}
        className="shrink-0 px-7 pb-8 pt-4">
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => {
            if (!canProceed) return;
            setAuthPassword(password);
            setAppPhase("auth-profile");
          }}
          disabled={!canProceed}
          className="w-full py-4 rounded-full font-semibold text-[15px] shadow-sm disabled:opacity-40 flex items-center justify-center bg-foreground text-background">
          Continue
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default AuthPassword;
