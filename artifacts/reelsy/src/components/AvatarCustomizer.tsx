import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Image as ImageIcon, Check } from "lucide-react";

interface AvatarPickerProps {
  onClose: () => void;
  onSave: (url: string) => void;
}

const STYLES = [
  { key: "avataaars",   label: "People"    },
  { key: "lorelei",     label: "Portraits" },
  { key: "micah",       label: "Illustrated"},
  { key: "bottts",      label: "Bots"      },
  { key: "pixel-art",   label: "Pixel"     },
  { key: "adventurer",  label: "Adventure" },
  { key: "fun-emoji",   label: "Fun"       },
  { key: "identicon",   label: "Geo"       },
  { key: "croodles",    label: "Croodles"  },
  { key: "notionists",  label: "Notion"    },
  { key: "open-peeps",  label: "Peeps"     },
  { key: "personas",    label: "Personas"  },
  { key: "rings",       label: "Rings"     },
  { key: "shapes",      label: "Shapes"    },
  { key: "thumbs",      label: "Thumbs"    },
  { key: "miniavs",     label: "Mini"      },
];

const SEEDS_BY_STYLE: Record<string, string[]> = {
  avataaars: [
    "Felix","Aneka","Jasper","Zara","Milan","Quinn","River","Blake",
    "Jade","Cleo","Leo","Sage","Hunter","Ash","Kai","Sam",
  ],
  lorelei: [
    "Nova","Luna","Sky","Rain","Storm","Cloud","Dawn","Mist",
    "Iris","Fern","Rue","Vera","Wren","Zoe","Mae","Ivy",
  ],
  micah: [
    "Kai","Sage","Reed","Flynn","Ash","Brook","Casey","Dale",
    "Eli","Gray","Jamie","Lane","Morgan","Noel","Perry","Quinn",
  ],
  bottts: [
    "Sparky","Zeno","Rylo","Coco","Bolt","Chip","Gizmo","Watt",
    "Nexo","Pixel","Robo","Servo","Vortex","Axiom","Delta","Echo",
  ],
  "pixel-art": [
    "Mario","Lara","Zack","Tess","Retro","Bit","Neo","Byte",
    "Glitch","Sprite","Voxel","Arcade","Neon","Chip","Grid","Dot",
  ],
  adventurer: [
    "Hunter","Ranger","Scout","Atlas","Rex","Dash","Flint","Axel",
    "Storm","Blaze","Drake","Falcon","Hawk","Jax","Knox","Ryder",
  ],
  "fun-emoji": [
    "Sunny","Happy","Cool","Wild","Sleek","Zen","Peak","Rush",
    "Bliss","Hype","Vibe","Glow","Chill","Spark","Zeal","Joy",
  ],
  identicon: [
    "Alpha","Beta","Gamma","Delta","Sigma","Omega","Zeta","Theta",
    "Kappa","Lambda","Phi","Chi","Psi","Rho","Tau","Upsilon",
  ],
  croodles: [
    "Curly","Wiggly","Loopy","Swirly","Spiral","Wavy","Twirl","Coil",
    "Squiggle","Zigzag","Doodle","Scribble","Loop","Arc","Curl","Helix",
  ],
  notionists: [
    "Calm","Bold","Free","Sharp","Soft","Pure","Deep","Vivid",
    "Clear","Warm","Cool","Still","Wide","Vast","Near","Open",
  ],
  "open-peeps": [
    "Lena","Omar","Tara","Hugo","Mila","Theo","Zara","Finn",
    "Nora","Evan","Lila","Axel","Cora","Dean","Mia","Rex",
  ],
  personas: [
    "Aria","Blake","Cole","Drew","Eden","Faith","Grant","Hope",
    "Ivan","Jana","Kurt","Lisa","Mark","Nina","Oscar","Pam",
  ],
  rings: [
    "Ring1","Ring2","Ring3","Ring4","Ring5","Ring6","Ring7","Ring8",
    "Ring9","Ring10","Ring11","Ring12","Ring13","Ring14","Ring15","Ring16",
  ],
  shapes: [
    "Geo1","Geo2","Geo3","Geo4","Geo5","Geo6","Geo7","Geo8",
    "Geo9","Geo10","Geo11","Geo12","Geo13","Geo14","Geo15","Geo16",
  ],
  thumbs: [
    "Thumb1","Thumb2","Thumb3","Thumb4","Thumb5","Thumb6","Thumb7","Thumb8",
    "Thumb9","Thumb10","Thumb11","Thumb12","Thumb13","Thumb14","Thumb15","Thumb16",
  ],
  miniavs: [
    "Mini1","Mini2","Mini3","Mini4","Mini5","Mini6","Mini7","Mini8",
    "Mini9","Mini10","Mini11","Mini12","Mini13","Mini14","Mini15","Mini16",
  ],
};

const dicebearUrl = (style: string, seed: string) =>
  `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

const AvatarCustomizer = ({ onClose, onSave }: AvatarPickerProps) => {
  const [activeStyle, setActiveStyle] = useState(STYLES[0].key);
  const [selected, setSelected] = useState<string | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const styleScrollRef = useRef<HTMLDivElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setSelected(url);
    };
    reader.readAsDataURL(file);
  };

  const currentAvatars = SEEDS_BY_STYLE[activeStyle] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col"
    >
      <input ref={galleryRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <X className="w-4 h-4" />
        </motion.button>
        <p className="font-bold text-[15px]">Profile Picture</p>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => selected && onSave(selected)}
          disabled={!selected}
          className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center disabled:opacity-30">
          <Check className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* Preview */}
      <div className="shrink-0 flex flex-col items-center py-3 gap-3">
        <div className="w-20 h-20 rounded-full bg-secondary overflow-hidden shadow-xl ring-4 ring-background">
          {selected ? (
            selected.startsWith("<") ? (
              <div dangerouslySetInnerHTML={{ __html: selected }} className="w-full h-full" />
            ) : (
              <img src={selected} alt="preview" className="w-full h-full object-cover" />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-3xl text-muted-foreground/20 font-bold">?</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => cameraRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-secondary text-[11px] font-semibold">
            <Camera className="w-3 h-3" /> Camera
          </motion.button>
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => galleryRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-secondary text-[11px] font-semibold">
            <ImageIcon className="w-3 h-3" /> Gallery
          </motion.button>
        </div>
      </div>

      {/* Style tabs */}
      <div ref={styleScrollRef} className="shrink-0 flex gap-1.5 px-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {STYLES.map((s) => (
          <motion.button key={s.key} whileTap={{ scale: 0.92 }} onClick={() => setActiveStyle(s.key)}
            className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
              activeStyle === s.key ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
            }`}>
            {s.label}
          </motion.button>
        ))}
      </div>

      {/* Avatar grid — 16 per style = 256 total */}
      <div className="flex-1 overflow-y-auto overscroll-none px-4 pb-4">
        <AnimatePresence mode="wait">
          <motion.div key={activeStyle}
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-4 gap-3 pt-1">
            {currentAvatars.map((seed) => {
              const url = dicebearUrl(activeStyle, seed);
              const isSelected = selected === url;
              return (
                <motion.button key={`${activeStyle}-${seed}`} whileTap={{ scale: 0.88 }}
                  onClick={() => setSelected(isSelected ? null : url)}
                  className={`relative aspect-square rounded-2xl overflow-hidden bg-secondary transition-all ${
                    isSelected ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""
                  }`}>
                  <img src={url} alt={seed} className="w-full h-full object-cover" loading="lazy" />
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }} transition={{ type: "spring", stiffness: 500, damping: 24 }}
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center shadow">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Save button */}
      <div className="shrink-0 px-5 pb-8 pt-2">
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => selected && onSave(selected)}
          disabled={!selected}
          className="w-full py-4 rounded-full bg-foreground text-background font-bold text-[14px] disabled:opacity-30 transition-opacity">
          Use this picture
        </motion.button>
      </div>
    </motion.div>
  );
};

export default AvatarCustomizer;
