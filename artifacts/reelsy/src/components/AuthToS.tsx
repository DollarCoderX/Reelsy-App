import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { ShieldCheck, FileText, Heart, ChevronLeft } from "lucide-react";

const rules = [
  { icon: Heart, title: "Be respectful", desc: "Kindness is non-negotiable. Harassment and hate speech are not tolerated." },
  { icon: FileText, title: "Own your content", desc: "Everything you share is yours. We only need permission to display them." },
  { icon: ShieldCheck, title: "Privacy first", desc: "Your data is yours. We never sell your personal information." },
];

// ---- Terms of Service Full Screen ----
const TermsModal = ({ onClose }: { onClose: () => void }) => (
  <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
    transition={{ type: "spring", stiffness: 300, damping: 30 }}
    className="absolute inset-0 z-[60] bg-background flex flex-col">
    <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-secondary/40">
      <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
        className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
        <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
      </motion.button>
      <p className="font-bold text-[15px]">Terms of Service</p>
      <div className="w-9" />
    </div>
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-[13px] text-muted-foreground">
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">1. Acceptance of Terms</p>
        <p>By using Reelsy, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the app.</p>
      </div>
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">2. User Conduct</p>
        <p>You agree not to use Reelsy for any unlawful or abusive purposes. This includes harassment, hate speech, and illegal content.</p>
      </div>
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">3. Content Ownership</p>
        <p>You retain all rights to content you create and share. By sharing on Reelsy, you grant us permission to display and process your content.</p>
      </div>
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">4. Privacy</p>
        <p>Reelsy does not sell your data. We collect minimal data required to operate the platform. Your messages are end-to-end encrypted. See our Privacy Policy for full details.</p>
      </div>
   
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">5. Account Termination</p>
        <p>Reelsy reserves the right to suspend or terminate accounts that violate these terms. You may delete your account at any time from Settings.</p>
      </div>
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">6. Changes to Terms</p>
        <p>We may update these terms from time to time. Continued use of Reelsy after changes constitutes acceptance of the updated terms.</p>
      </div>
    </div>
  </motion.div>
);

// ---- Privacy Policy Full Screen ----
const PrivacyModal = ({ onClose }: { onClose: () => void }) => (
  <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
    transition={{ type: "spring", stiffness: 300, damping: 30 }}
    className="absolute inset-0 z-[60] bg-background flex flex-col">
    <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-secondary/40">
      <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
        className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
        <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
      </motion.button>
      <p className="font-bold text-[15px]">Privacy Policy</p>
      <div className="w-9" />
    </div>
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-[13px] text-muted-foreground">
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">1. Information We Collect</p>
        <p>We collect minimal information required to operate Reelsy, including: account information (username, email, age), profile data (avatar, bio), and communication metadata (timestamps, message recipients).</p>
      </div>
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">2. How We Use Your Data</p>
        <p>Your data is used to provide and improve Reelsy services. We never sell or share your personal data with third parties for marketing purposes.</p>
      </div>
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">3. Data Security</p>
        <p>Your messages are protected with end-to-end encryption. We use industry-standard security practices to protect your data.</p>
      </div>
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">4. Age-Based Content</p>
        <p>Reelsy uses your age to filter age-appropriate content. Adult content (18+) is restricted based on your age at the time of accessing the service.</p>
      </div>
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">5. Your Rights</p>
        <p>You can request access, deletion, or correction of your personal data at any time. Contact us through Settings → Help & Support.</p>
      </div>
      <div>
        <p className="font-bold text-foreground text-[13px] mb-1">6. Changes to This Policy</p>
        <p>We may update this privacy policy from time to time. We will notify you of significant changes via in-app notifications.</p>
      </div>
    </div>
  </motion.div>
);

const AuthToS = () => {
  const { setAppPhase } = useAppContext();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute inset-0 flex flex-col bg-background text-foreground"
    >
      <div className="shrink-0 px-4 pt-5 flex items-center justify-between">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAppPhase("welcome")}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>
        
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none px-7 pt-6 pb-4">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-7">
          <h1 className="text-[26px] font-bold tracking-tight">Before we continue</h1>
          <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">A few ground rules for Reelsy.</p>
        </motion.div>

        <div className="space-y-3">
          {rules.map((r, i) => (
            <motion.div key={r.title}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 + i * 0.07 }}
              className="flex items-start gap-3.5 p-4 rounded-2xl bg-secondary/50">
              <div className="w-9 h-9 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0">
                <r.icon className="w-4 h-4" strokeWidth={2} />
              </div>
              <div className="flex-1 pt-0.5">
                <p className="font-semibold text-[13px]">{r.title}</p>
                <p className="text-muted-foreground text-[12px] mt-1 leading-relaxed">{r.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.32 }}
        className="shrink-0 px-7 pb-10 pt-4 space-y-2">
        <p className="text-[11px] text-center text-muted-foreground leading-relaxed px-2">
          By tapping Agree, you accept our{" "}
          <motion.button 
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowTerms(true)}
            className="text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            Terms of Service
          </motion.button>{" "}
          and{" "}
          <motion.button 
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowPrivacy(true)}
            className="text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            Privacy Policy
          </motion.button>
          .
        </p>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setAppPhase("auth-email")}
          className="w-full py-4 rounded-full bg-foreground text-background font-semibold text-[15px] shadow-sm">
          Agree &amp; Continue
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
        {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
      </AnimatePresence>
    </motion.div>
  );
};

export default AuthToS;
