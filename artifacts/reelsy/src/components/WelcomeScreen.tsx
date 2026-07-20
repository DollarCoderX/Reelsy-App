import { useState } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { Zap, MessageCircle, Lock } from "lucide-react";
import reelsyLogo from "@assets/db1645cc1ed95625a5dff41ee9a0f164_1778235733181.jpg";

const features = [
  { icon: Zap, title: "Pure Content", desc: "No clutter — just what matters to you." },
  { icon: MessageCircle, title: "Intimate Chat", desc: "Connect deeply, without the noise." },
  { icon: Lock, title: "Privacy", desc: "Reelsy top priority is privacy." },
];

const WelcomeScreen = () => {
  const { setAppPhase, ip } = useAppContext();
  const [loading, setLoading] = useState(false);

  const handleGetStarted = async () => {
    setLoading(true);
    const isValid = await ip.checkConnection();
    setLoading(false);
    if (isValid) setAppPhase("auth-tos");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35 }}
      className="absolute inset-0 flex flex-col bg-background text-foreground"
    >
      <div className="flex-1 overflow-y-auto overscroll-none px-7 pt-16 pb-4 flex flex-col">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
          className="mb-10">
          <img src={reelsyLogo} alt="Reelsy" className="w-12 h-12 rounded-2xl shadow-sm mb-6 object-cover" />
          <h1 className="text-[30px] font-bold tracking-tight leading-tight text-foreground">
            Your world,{" "}
            <span className="text-muted-foreground font-normal italic">unfiltered.</span>
          </h1>
          <p className="mt-3 text-[14px] text-muted-foreground leading-relaxed">
            The social app built for real people. No ads, no algorithms gaming your attention.
          </p>
        </motion.div>

        <div className="space-y-4 flex-1">
          {features.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 + i * 0.08 }}
              className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/50">
              <div className="w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0">
                <f.icon className="w-4.5 h-4.5" strokeWidth={2} />
              </div>
              <div>
                <p className="font-semibold text-[14px]">{f.title}</p>
                <p className="text-muted-foreground text-[12px] mt-0.5">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.42 }}
        className="shrink-0 px-7 pb-10 pt-5 space-y-3">
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleGetStarted} disabled={loading}
          className="w-full py-4 rounded-full bg-foreground text-background font-semibold text-[15px] shadow-sm disabled:opacity-50">
          {loading ? "Checking..." : "Get Started"}
        </motion.button>
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-[13px] text-muted-foreground">Already have an account?</span>
          <button onClick={() => setAppPhase("auth-login")}
            className="text-[13px] font-semibold text-foreground hover:opacity-70 transition-opacity">
            Sign in
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WelcomeScreen;
