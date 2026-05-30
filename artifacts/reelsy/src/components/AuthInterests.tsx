import { useState } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { ChevronLeft } from "lucide-react";

const INTERESTS = [
  "Technology", "Music", "Sports", "Art", "Gaming", "Coding", "AI",
  "Travel", "Food", "Fashion", "Film", "Books",
  "Fitness", "Photography", "Science", "Politics",
  "Memes", "Business", "Wellness", "Design",
  "Culture", "Finance", "Comedy", "Nature",
];

const AuthInterests = () => {
  const { setAppPhase, user, setUser } = useAppContext();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (interest: string) =>
    setSelected((prev) => prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]);

  const handleNext = () => {
    if (selected.length < 3) return;
    if (user) setUser({ ...user, interests: selected });
    setAppPhase("auth-friends");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute inset-0 flex flex-col bg-background text-foreground"
    >
      <div className="shrink-0 px-4 pt-5">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAppPhase("auth-profile")}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none px-7 pt-5 pb-4">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-7">
          <h1 className="text-[26px] font-bold tracking-tight">What are you into?</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">Pick at least 3 to personalize your feed.</p>
        </motion.div>

        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((interest, i) => {
            const isSelected = selected.includes(interest);
            return (
              <motion.button key={interest}
                initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 350, damping: 24, delay: i * 0.025 }}
                whileTap={{ scale: 0.92 }} onClick={() => toggle(interest)}
                className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                  isSelected ? "bg-foreground text-background" : "bg-secondary text-foreground"
                }`}>
                {interest}
              </motion.button>
            );
          })}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }} className="shrink-0 px-7 pb-10 pt-4 space-y-1.5">
        {selected.length > 0 && selected.length < 3 && (
          <p className="text-center text-[12px] text-muted-foreground">{3 - selected.length} more to go</p>
        )}
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleNext} disabled={selected.length < 3}
          className="w-full py-4 rounded-full bg-foreground text-background font-semibold text-[15px] shadow-sm disabled:opacity-40 transition-opacity">
          {selected.length >= 3 ? "Next" : `${selected.length} / 3 selected`}
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default AuthInterests;
