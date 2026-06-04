import { useState } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Bell, MapPin, Users, Fingerprint, ChevronLeft } from "lucide-react";

const PERMS = [
  { key: "notifications", icon: Bell, title: "Notifications", desc: "Get updates on replies and mentions" },
  { key: "location", icon: MapPin, title: "Location", desc: "Discover content near you" },
  { key: "contacts", icon: Users, title: "Contacts", desc: "Find people you already know" },
  { key: "faceid", icon: Fingerprint, title: "Face ID / Biometrics", desc: "Quick and secure login" },
];

const AuthPermissions = () => {
  const { setAppPhase, user, authEmail, authPassword, setUser, setAuthPassword } = useAppContext();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

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
        <motion.button whileTap={{ scale: 0.97 }} onClick={async () => {
            if (!user) {
              toast({ title: 'Unable to complete signup', description: 'Missing profile details.', variant: 'destructive' });
              return;
            }

            const shouldRegister = !!authEmail && !!authPassword;
            if (!shouldRegister) {
              setAppPhase('workspace-setup');
              return;
            }

            setIsSaving(true);
            try {
              const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: authEmail,
                  password: authPassword,
                  displayName: user.nickname || user.username.replace(/^@/, ''),
                  username: user.username.replace(/^@/, ''),
                  age: user.age,
                  interests: user.interests || [],
                  profileImage: user.avatar,
                }),
              });

              if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Registration failed');
              }

              const result = await response.json();
              localStorage.setItem('authToken', result.token);
              setUser({
                username: result.user.username.startsWith('@') ? result.user.username : `@${result.user.username}`,
                nickname: result.user.displayName,
                age: result.user.age,
                email: result.user.email,
                avatar: result.user.profileImage || undefined,
                interests: result.user.interests || undefined,
                supabaseId: result.user.supabaseId,
                isBanned: result.user.isBanned || false,
                banReason: result.user.banReason,
                bannedAt: result.user.bannedAt,
                bannedUntil: result.user.bannedUntil,
                isSuspended: result.user.isSuspended || false,
                suspensionReason: result.user.suspensionReason,
                suspensionDetails: result.user.suspensionDetails,
              });

              toast({ title: 'Welcome to Reelsy', description: 'Your account has been created.', variant: 'default' });
              setAuthPassword(null);
              setAppPhase('workspace-setup');
            } catch (error) {
              toast({ title: 'Registration failed', description: error instanceof Error ? error.message : 'Unable to create account.', variant: 'destructive' });
              console.error('Registration error:', error);
            } finally {
              setIsSaving(false);
            }
          }}
          disabled={isSaving}
          className="w-full py-4 rounded-full bg-foreground text-background font-semibold text-[15px] shadow-sm disabled:opacity-40">
          {isSaving ? 'Saving...' : "Let's go"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default AuthPermissions;
