import { useState } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Loader2, Mail } from "lucide-react";

const AuthEmail = () => {
  const { setAppPhase, ip, setAuthEmail } = useAppContext();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleNext = async () => {
    if (!isValidEmail(email) || isLoading) return;
    setIsLoading(true);
    const isValid = await ip.checkConnection();
    if (!isValid) {
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      
      if (!response.ok) {
        let data: any = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        if (data?.error === "TEMP_EMAIL_BLOCKED") {
          toast({
            title: "Sorry",
            description: data?.message || "Sorry, you can’t use a temporary email to sign up.",
            variant: "destructive",
          });
          return;
        }

        throw new Error("Failed to send OTP");
      }

      setAuthEmail(email);
      setAppPhase("auth-otp");
    } catch (err) {
      toast({ title: "Error😪", description: "Failed to send code. Please try again later.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const isValid = await ip.checkConnection();
    if (!isValid) {
      setGoogleLoading(false);
      return;
    }
    // Mockup Google login flow
    setTimeout(() => {
      setAppPhase("auth-profile");
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute inset-0 flex flex-col bg-background text-foreground"
    >
      <div className="shrink-0 px-4 pt-5">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAppPhase("auth-tos")}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-7 py-4 min-h-0">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }} className="mb-6">
          <h1 className="text-[24px] font-bold tracking-tight leading-tight">
            What's your email?
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            We'll send a one-time code to verify your account.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }} className="flex flex-col gap-3">
          
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Mail className="w-5 h-5" />
            </div>
            <input
              type="email"
              placeholder="micheal@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              style={{ fontSize: 16 }}
              className="w-full h-[52px] pl-12 pr-4 bg-secondary rounded-2xl font-medium outline-none"
            />
          </div>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-secondary/60" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-secondary/60" />
          </div>

          <motion.button 
            whileTap={{ scale: 0.97 }} 
            onClick={handleGoogleLogin}
            disabled={googleLoading || isLoading}
            className="relative w-full h-[52px] flex items-center justify-center gap-3 bg-secondary/50 rounded-2xl font-semibold text-[14px] transition-colors hover:bg-secondary disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </motion.button>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16 }}
        className="shrink-0 px-7 pb-8 pt-4">
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleNext}
          disabled={!isValidEmail(email) || isLoading || googleLoading}
          className="w-full py-4 rounded-full font-semibold text-[15px] shadow-sm disabled:opacity-40 flex items-center justify-center gap-2 bg-foreground text-background">
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying...</> : "Next"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default AuthEmail;
