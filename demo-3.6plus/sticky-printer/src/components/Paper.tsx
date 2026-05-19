import { motion, AnimatePresence } from "framer-motion";

type PrintPhase = "idle" | "inserting" | "printing" | "ejecting" | "flying";

interface PaperProps {
  phase: PrintPhase;
  text: string;
  color: string;
}

const springConfig = { type: "spring" as const, stiffness: 80, damping: 18 };

export default function Paper({ phase, text, color }: PaperProps) {
  return (
    <div className="relative h-32 flex items-center justify-center overflow-hidden">
      <AnimatePresence>
        {phase !== "idle" && (
          <motion.div
            className="absolute w-48 rounded shadow-md"
            style={{ backgroundColor: color }}
            initial={
              phase === "inserting"
                ? { y: -80, opacity: 0, scale: 0.8 }
                : { y: 0, opacity: 1, scale: 1 }
            }
            animate={
              phase === "inserting"
                ? { y: 0, opacity: 1, scale: 1 }
                : phase === "printing"
                  ? { y: 0, opacity: 1, scale: 1 }
                  : phase === "ejecting"
                    ? { y: 60, opacity: 1, scale: 1 }
                    : { y: 120, opacity: 0, scale: 0.5 }
            }
            exit={{ opacity: 0, scale: 0.3 }}
            transition={
              phase === "ejecting"
                ? springConfig
                : phase === "flying"
                  ? { ...springConfig, duration: 0.6 }
                  : { duration: 0.3 }
            }
          >
            <div className="p-3 font-handwriting text-stone-800 text-lg leading-relaxed">
              {phase !== "inserting" && text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
