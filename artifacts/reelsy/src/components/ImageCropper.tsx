/**
 * ImageCropper — lightweight canvas-based image cropper.
 * Drag to reposition, pinch/scroll to zoom, press Done to export.
 * Outputs a JPEG data URL at 1200×400 (3:1 banner ratio).
 */
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  /** raw data URL or object URL from the file input */
  src: string;
  onCrop: (dataUrl: string) => void;
  onCancel: () => void;
}

export default function ImageCropper({ src, onCrop, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });

  const drag = useRef({ on: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const pinch = useRef({ on: false, d0: 0, s0: 1 });

  /** Base scale so image fills the container (cover-fit). */
  const baseScale = () => {
    const c = containerRef.current;
    if (!c || !natural.w) return 1;
    return Math.max(c.offsetWidth / natural.w, c.offsetHeight / natural.h);
  };

  /** Clamp offset so no empty margins appear inside the crop frame. */
  const clamp = (x: number, y: number, s: number) => {
    const c = containerRef.current;
    if (!c || !natural.w) return { x, y };
    const cw = c.offsetWidth, ch = c.offsetHeight;
    const dw = natural.w * baseScale() * s;
    const dh = natural.h * baseScale() * s;
    const mx = Math.max(0, (dw - cw) / 2);
    const my = Math.max(0, (dh - ch) / 2);
    return { x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
  };

  // ── Mouse drag ──
  const onMouseDown = (e: React.MouseEvent) => {
    drag.current = { on: true, sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current.on) return;
    setOffset(clamp(drag.current.ox + e.clientX - drag.current.sx, drag.current.oy + e.clientY - drag.current.sy, scale));
  };
  const onMouseUp = () => { drag.current.on = false; };

  // ── Scroll zoom ──
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const s = Math.max(0.5, Math.min(5, scale * (e.deltaY > 0 ? 0.92 : 1.08)));
    setScale(s);
    setOffset(o => clamp(o.x, o.y, s));
  };

  // ── Touch drag + pinch zoom ──
  const dist = (e: React.TouchEvent) =>
    Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      drag.current = { on: true, sx: e.touches[0].clientX, sy: e.touches[0].clientY, ox: offset.x, oy: offset.y };
    } else if (e.touches.length === 2) {
      drag.current.on = false;
      pinch.current = { on: true, d0: dist(e), s0: scale };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && drag.current.on) {
      setOffset(clamp(drag.current.ox + e.touches[0].clientX - drag.current.sx, drag.current.oy + e.touches[0].clientY - drag.current.sy, scale));
    } else if (e.touches.length === 2 && pinch.current.on) {
      const s = Math.max(0.5, Math.min(5, pinch.current.s0 * dist(e) / pinch.current.d0));
      setScale(s);
      setOffset(o => clamp(o.x, o.y, s));
    }
  };
  const onTouchEnd = () => { drag.current.on = false; pinch.current.on = false; };

  // ── Zoom buttons ──
  const zoom = (factor: number) => {
    const s = Math.max(0.5, Math.min(5, scale * factor));
    setScale(s);
    setOffset(o => clamp(o.x, o.y, s));
  };

  // ── Export ──
  const handleDone = () => {
    const c = containerRef.current;
    const img = imgRef.current;
    if (!c || !img || !natural.w) return;

    const cw = c.offsetWidth, ch = c.offsetHeight;
    const ts = baseScale() * scale; // total render scale

    // Top-left of the displayed image in container coordinates
    const imgLeft = (cw - natural.w * ts) / 2 + offset.x;
    const imgTop  = (ch - natural.h * ts) / 2 + offset.y;

    // Which portion of the natural image is visible inside [0..cw] × [0..ch]
    const srcX = -imgLeft / ts;
    const srcY = -imgTop  / ts;
    const srcW = cw / ts;
    const srcH = ch / ts;

    const canvas = document.createElement("canvas");
    canvas.width  = 1200;
    canvas.height = 400; // 3:1 banner
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, 1200, 400);
    onCrop(canvas.toDataURL("image/jpeg", 0.9));
  };

  const ts = baseScale() * scale;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex flex-col bg-black"
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onCancel}
          className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
          <X className="w-4 h-4 text-white" />
        </motion.button>
        <p className="text-white font-semibold text-[15px]">Move and Scale</p>
        <motion.button whileTap={{ scale: 0.9 }} onClick={handleDone}
          className="px-4 py-1.5 rounded-full bg-white text-black font-bold text-[13px]">
          Done
        </motion.button>
      </div>

      {/* Crop viewport — 3:1 */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden select-none"
          style={{ aspectRatio: "3 / 1", cursor: drag.current.on ? "grabbing" : "grab" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Image */}
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={e => {
              const img = e.currentTarget;
              setNatural({ w: img.naturalWidth, h: img.naturalHeight });
            }}
            className="absolute pointer-events-none select-none"
            style={{
              left: "50%",
              top: "50%",
              width: natural.w || "100%",
              height: natural.h || "auto",
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${natural.w ? ts : 1})`,
              transformOrigin: "center center",
              maxWidth: "none",
            }}
          />

          {/* Rule-of-thirds grid overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full border-2 border-white/50 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/20" />
              ))}
            </div>
          </div>
        </div>

        <p className="text-white/40 text-[11px]">Drag to reposition · Pinch or scroll to zoom</p>

        {/* Zoom bar */}
        <div className="flex items-center gap-3 mt-1">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => zoom(0.85)}
            className="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center text-xl font-light leading-none">
            −
          </motion.button>
          <div className="w-28 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{ width: `${Math.min(100, ((scale - 0.5) / 4.5) * 100)}%` }}
            />
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => zoom(1.15)}
            className="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center text-xl font-light leading-none">
            +
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
