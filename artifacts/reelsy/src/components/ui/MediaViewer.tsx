import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, MessageCircle, Share2, Bookmark, Download, MoreVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface MediaViewerProps {
  media: string | string[];
  type: "image" | "video";
  onClose: () => void;
  initialIndex?: number;
}

const MediaViewer = ({ media, type, onClose, initialIndex = 0 }: MediaViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const mediaList = Array.isArray(media) ? media : [media];

  const next = () => setCurrentIndex((i) => (i + 1) % mediaList.length);
  const prev = () => setCurrentIndex((i) => (i - 1 + mediaList.length) % mediaList.length);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black flex flex-col"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-12 pb-6 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="p-2 rounded-full bg-white/10 backdrop-blur-md">
          <X className="w-5 h-5 text-white" />
        </motion.button>
        {mediaList.length > 1 && (
          <span className="text-white text-[13px] font-bold bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
            {currentIndex + 1} / {mediaList.length}
          </span>
        )}
        <div className="flex items-center gap-2">
          <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-full bg-white/10 backdrop-blur-md">
            <Download className="w-5 h-5 text-white" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-full bg-white/10 backdrop-blur-md">
            <MoreVertical className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      </div>

      {/* Media Content */}
      <div className="flex-1 flex items-center justify-center relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full h-full flex items-center justify-center"
          >
            {type === "image" ? (
              <img src={mediaList[currentIndex]} alt="" className="max-w-full max-h-full object-contain" />
            ) : (
              <video src={mediaList[currentIndex]} className="max-w-full max-h-full object-contain" controls autoPlay loop />
            )}
          </motion.div>
        </AnimatePresence>

        {mediaList.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-4 p-2 rounded-full bg-white/10 backdrop-blur-md">
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button onClick={next} className="absolute right-4 p-2 rounded-full bg-white/10 backdrop-blur-md">
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-12 pt-10 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button className="flex flex-col items-center gap-1">
              <Heart className="w-7 h-7 text-white" />
              <span className="text-[11px] text-white font-bold">1.2K</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <MessageCircle className="w-7 h-7 text-white" />
              <span className="text-[11px] text-white font-bold">48</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <Share2 className="w-7 h-7 text-white" />
              <span className="text-[11px] text-white font-bold">Share</span>
            </button>
          </div>
          <button className="flex flex-col items-center gap-1">
            <Bookmark className="w-7 h-7 text-white" />
            <span className="text-[11px] text-white font-bold">Save</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default MediaViewer;
