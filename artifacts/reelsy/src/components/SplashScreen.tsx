import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import reelsyLogo from "@assets/db1645cc1ed95625a5dff41ee9a0f164_1778235733181.jpg";

const SplashScreen = () => {
  const { setAppPhase } = useAppContext();

  useEffect(() => {
    const timer = setTimeout(() => setAppPhase("welcome"), 2800);
    return () => clearTimeout(timer);
  }, [setAppPhase]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 flex flex-col items-center justify-center bg-white"
    >
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.1 }}
        className="relative"
      >
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-8 rounded-full bg-white/10 blur-2xl"
        />
        <motion.div
          animate={{ opacity: [0.15, 0.4, 0.15] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          className="absolute -inset-4 rounded-3xl bg-black/20 blur-xl"
        />
        <img
          src={reelsyLogo}
          alt="Reelsy"
          className="w-24 h-24 rounded-[22px] relative z-10 shadow-[0_0_60px_rgba(255,255,255,0.25)]"
        />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mt-7 text-black/90 text-3xl font-bold tracking-tight"
      >
        Reelsy
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.6, delay: 1.8, ease: "easeOut" }}
        className="mt-12 w-8 h-1 bg-black/30 rounded-full"
      />
    </motion.div>
  );
};

export default SplashScreen;
