import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import FeatureDetailSheet from "./FeatureDetailSheet";

export default function FeatureIntroSheet({
  open,
  title,
  description,
  learnMoreText = "Learn more",
  onOk,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  learnMoreText?: string;
  onOk: () => void;
  onClose: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-black/45 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-[120] bg-background rounded-t-[28px] px-5 pt-4 pb-10"
              style={{ maxHeight: "82%" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[16px]">{title}</p>
                  <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{description}</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setShowDetail(true)}
                  className="text-blue-500 font-semibold text-[13px] active:opacity-70 transition-opacity"
                >
                  {learnMoreText} →
                </button>
              </div>

              <div className="mt-6">
                <button
                  onClick={onOk}
                  className="w-full py-3.5 rounded-full bg-foreground text-background font-bold text-[14px]"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <FeatureDetailSheet
        open={showDetail}
        featureTitle={title}
        featureDescription={description}
        onClose={() => setShowDetail(false)}
      />
    </>
  );
}

