import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, MessageCircle, Share2, Bookmark, Download, MoreVertical, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useState, useRef } from "react";

interface MediaViewerProps {
  media: string | string[];
  type: "image" | "video";
  onClose: () => void;
  initialIndex?: number;
  postCaption?: string;
  authorHandle?: string;
}

const WATERMARK_TEXT = "Reelsy";

const downloadWithWatermark = async (src: string, caption?: string, handle?: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const pad = 14;
      const badgeH = 36;
      const badgeW = 100;
      const x = canvas.width - badgeW - pad;
      const y = canvas.height - badgeH - pad;

      ctx.save();
      ctx.globalAlpha = 0.82;
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.roundRect(x, y, badgeW, badgeH, 10);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.round(canvas.width * 0.022 + 10)}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(WATERMARK_TEXT, x + badgeW / 2, y + badgeH / 2);
      ctx.restore();

      if (handle) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, canvas.height - 36, canvas.width, 36);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#fff";
        ctx.font = `${Math.round(canvas.width * 0.025 + 8)}px -apple-system, sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(handle, 14, canvas.height - 18);
        ctx.restore();
      }

      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("Blob failed")); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `reelsy-${Date.now()}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
        resolve();
      }, "image/jpeg", 0.92);
    };
    img.onerror = () => {
      const a = document.createElement("a");
      a.href = src;
      a.download = `reelsy-${Date.now()}.jpg`;
      a.target = "_blank";
      a.click();
      resolve();
    };
    img.src = src;
  });
};

const MediaViewer = ({ media, type, onClose, initialIndex = 0, postCaption, authorHandle }: MediaViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const mediaList = Array.isArray(media) ? media : [media];

  const next = () => setCurrentIndex((i) => (i + 1) % mediaList.length);
  const prev = () => setCurrentIndex((i) => (i - 1 + mediaList.length) % mediaList.length);

  const handleDownload = async () => {
    if (downloading || type === "video") return;
    setDownloading(true);
    try {
      await downloadWithWatermark(mediaList[currentIndex], postCaption, authorHandle);
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 2000);
    } catch {
      const a = document.createElement("a");
      a.href = mediaList[currentIndex];
      a.download = `reelsy-${Date.now()}.jpg`;
      a.target = "_blank";
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black flex flex-col"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-12 pb-6 bg-gradient-to-b from-black/70 to-transparent flex items-center justify-between">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="p-2 rounded-full bg-white/10 backdrop-blur-md">
          <X className="w-5 h-5 text-white" />
        </motion.button>
        {mediaList.length > 1 && (
          <span className="text-white text-[13px] font-bold bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
            {currentIndex + 1} / {mediaList.length}
          </span>
        )}
        <div className="flex items-center gap-2">
          {type === "image" && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleDownload}
              disabled={downloading}
              className="p-2 rounded-full bg-white/10 backdrop-blur-md relative"
            >
              <AnimatePresence mode="wait">
                {downloadDone ? (
                  <motion.div key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Check className="w-5 h-5 text-emerald-400" />
                  </motion.div>
                ) : downloading ? (
                  <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <motion.div key="dl" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Download className="w-5 h-5 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          )}
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
              <img
                src={mediaList[currentIndex]}
                alt=""
                className="max-w-full max-h-full object-contain"
                onDoubleClick={() => setLiked(true)}
              />
            ) : (
              <video
                src={mediaList[currentIndex]}
                className="max-w-full max-h-full object-contain"
                controls
                autoPlay
                loop
                playsInline
              />
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
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-12 pt-10 bg-gradient-to-t from-black/70 to-transparent">
        {postCaption && (
          <p className="text-white text-[12px] mb-4 leading-5 max-w-[280px] line-clamp-2 opacity-80">{postCaption}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <motion.button
              whileTap={{ scale: 1.2 }}
              onClick={() => setLiked((l) => !l)}
              className="flex flex-col items-center gap-1"
            >
              <Heart className={`w-7 h-7 ${liked ? "fill-rose-500 text-rose-500" : "text-white"} transition-colors`} />
              <span className="text-[11px] text-white font-bold">{liked ? "1.2K" : "1.2K"}</span>
            </motion.button>
            <button className="flex flex-col items-center gap-1">
              <MessageCircle className="w-7 h-7 text-white" />
              <span className="text-[11px] text-white font-bold">48</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <Share2 className="w-7 h-7 text-white" />
              <span className="text-[11px] text-white font-bold">Share</span>
            </button>
          </div>
          <motion.button
            whileTap={{ scale: 1.1 }}
            onClick={() => setSaved((s) => !s)}
            className="flex flex-col items-center gap-1"
          >
            <Bookmark className={`w-7 h-7 ${saved ? "fill-white text-white" : "text-white"} transition-colors`} />
            <span className="text-[11px] text-white font-bold">Save</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default MediaViewer;
