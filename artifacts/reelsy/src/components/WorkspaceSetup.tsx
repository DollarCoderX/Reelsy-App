import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/context/AppContext";

const SHAPES_STATES = [
  // State 0: Mockup layout
  [
    { left: 0, top: 0, width: 80, height: 180, borderRadius: "24px" }, // Tall sidebar
    { left: 96, top: 0, width: 46, height: 46, borderRadius: "50%" }, // Circle 1
    { left: 150, top: 0, width: 46, height: 46, borderRadius: "50%" }, // Circle 2
    { left: 204, top: 0, width: 46, height: 46, borderRadius: "50%" }, // Circle 3
    { left: 96, top: 56, width: 72, height: 50, borderRadius: "20px" }, // Medium 1
    { left: 178, top: 56, width: 72, height: 50, borderRadius: "20px" }, // Medium 2
    { left: 96, top: 118, width: 154, height: 50, borderRadius: "25px" }, // Wide pill
  ],
  // State 1: Rearranged
  [
    { left: 174, top: 0, width: 80, height: 180, borderRadius: "24px" }, // Tall sidebar (moves right)
    { left: 0, top: 0, width: 46, height: 46, borderRadius: "12px" }, // Rounded square 1 (moves left)
    { left: 0, top: 56, width: 46, height: 46, borderRadius: "12px" }, // Rounded square 2
    { left: 0, top: 112, width: 46, height: 46, borderRadius: "12px" }, // Rounded square 3
    { left: 56, top: 0, width: 108, height: 50, borderRadius: "25px" }, // Medium 1
    { left: 56, top: 60, width: 108, height: 50, borderRadius: "20px" }, // Medium 2
    { left: 56, top: 120, width: 108, height: 60, borderRadius: "16px" }, // Wide pill
  ],
  // State 2: Center/Top focus
  [
    { left: 87, top: 60, width: 80, height: 120, borderRadius: "20px" }, // Tall sidebar in center
    { left: 0, top: 60, width: 78, height: 35, borderRadius: "10px" },
    { left: 0, top: 105, width: 78, height: 35, borderRadius: "10px" },
    { left: 0, top: 150, width: 78, height: 30, borderRadius: "10px" },
    { left: 176, top: 60, width: 78, height: 55, borderRadius: "12px" },
    { left: 176, top: 125, width: 78, height: 55, borderRadius: "12px" },
    { left: 0, top: 0, width: 254, height: 48, borderRadius: "24px" }, // Wide pill at top
  ],
  // State 3: Dual columns
  [
    { left: 0, top: 0, width: 60, height: 180, borderRadius: "24px" }, // Tall sidebar left
    { left: 72, top: 10, width: 34, height: 34, borderRadius: "50%" },
    { left: 110, top: 10, width: 34, height: 34, borderRadius: "50%" },
    { left: 148, top: 10, width: 34, height: 34, borderRadius: "50%" },
    { left: 194, top: 0, width: 60, height: 180, borderRadius: "24px" }, // Medium 1 becomes tall sidebar right
    { left: 72, top: 60, width: 112, height: 50, borderRadius: "25px" }, // Medium 2
    { left: 72, top: 120, width: 112, height: 50, borderRadius: "20px" }, // Wide pill
  ]
];

const WorkspaceSetup = () => {
  const { setAppPhase } = useAppContext();
  const [layoutState, setLayoutState] = useState(0);

  useEffect(() => {
    // Morph shapes every 1.6 seconds
    const interval = setInterval(() => {
      setLayoutState((prev) => (prev + 1) % SHAPES_STATES.length);
    }, 1600);

    // Stay on this screen for 8 seconds (7-9 seconds range)
    const timeout = setTimeout(() => {
      setAppPhase("main");
    }, 8000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [setAppPhase]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 bg-[#0C0C0C] text-white flex flex-col items-center justify-center p-6 z-[90]"
    >
      {/* Morphing Blocks Container */}
      <div className="relative w-[254px] h-[180px] mb-12 select-none pointer-events-none">
        {SHAPES_STATES[layoutState].map((style, idx) => (
          <motion.div
            key={idx}
            layout
            transition={{
              type: "spring",
              stiffness: 80,
              damping: 15,
            }}
            style={{
              position: "absolute",
              left: style.left,
              top: style.top,
              width: style.width,
              height: style.height,
              borderRadius: style.borderRadius,
            }}
            className="bg-[#1E1E1F] shadow-inner"
          />
        ))}
      </div>

      {/* Status Text Info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-center space-y-2.5"
      >
        <h2 className="text-[20px] font-bold text-white tracking-tight">
          Setting up your workspace...
        </h2>
        <p className="text-[13px] text-zinc-500 font-medium">
          Curating templates and inspiration
        </p>
      </motion.div>
    </motion.div>
  );
};

export default WorkspaceSetup;
