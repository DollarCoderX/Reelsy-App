import { useState } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { Bell, MapPin, Users, Fingerprint, ChevronLeft } from "lucide-react";

const PERMS = [
  { key: "notifications", icon: Bell, title: "Notifications", desc: "Get updates on replies and mentions" },
  { key: "location", icon: MapPin, title: "Location", desc: "Discover content near you" },
  { key: "contacts", icon: Users, title: "Contacts", desc: "Find people you already know" },
  { key: "faceid", icon: Fingerprint, title: "Face ID / Biometrics", desc: "Quick and secure login" },
];

const AuthPermissions = () => {
  const { setAppPhase } = useAppContext();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setEnabled((p) => ({ ...p, [key]: !p[key] }));

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute inset-0 flex flex-col bg-background text-foreground"
    >
      <div className="shrink-0 px-4 pt-5">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAppPhase("auth-interests")}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none px-7 pt-5 pb-4">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-7">
          <h1 className="text-[26px] font-bold tracking-tight">Enable features</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">You can always change these later.</p>
        </motion.div>

        <div className="space-y-2.5">
          {PERMS.map((p, i) => (
            <motion.button key={p.key}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.06 + i * 0.07 }}
              whileTap={{ scale: 0.98 }} onClick={() => toggle(p.key)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 text-left">
              <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shrink-0 shadow-sm">
                <p.icon className="w-4 h-4" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[13px]">{p.title}</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">{p.desc}</p>
              </div>
              <motion.div
                animate={{ backgroundColor: enabled[p.key] ? "hsl(var(--foreground))" : "hsl(var(--muted))" }}
                transition={{ duration: 0.18 }}
                className="w-11 h-6 rounded-full relative shrink-0 flex items-center px-0.5">
                <motion.div animate={{ x: enabled[p.key] ? 20 : 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="w-5 h-5 rounded-full bg-background shadow-sm" />
              </motion.div>
            </motion.button>
          ))}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.34 }} className="shrink-0 px-7 pb-10 pt-4">
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setAppPhase("main")}
          className="w-full py-4 rounded-full bg-foreground text-background font-semibold text-[15px] shadow-sm">
          Let's go
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default AuthPermissions;
