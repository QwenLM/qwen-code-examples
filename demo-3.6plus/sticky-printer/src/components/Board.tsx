import { AnimatePresence, motion } from "framer-motion";
import StickyNoteCard, { type StickyNote } from "./StickyNote";

export type { StickyNote } from "./StickyNote";

interface BoardProps {
  notes: StickyNote[];
  onDelete: (id: string) => void;
}

export default function Board({ notes, onDelete }: BoardProps) {
  if (notes.length === 0) {
    return (
      <div className="w-full max-w-3xl min-h-[200px] bg-stone-200/50 rounded-xl border-2 border-dashed border-stone-300 flex items-center justify-center">
        <p className="text-stone-400 text-lg">还没有便签，打印一张吧！</p>
      </div>
    );
  }

  return (
    <motion.div
      className="w-full max-w-3xl min-h-[200px] bg-stone-200/50 rounded-xl p-6 border border-stone-300"
      layout
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {notes.map((note) => (
            <StickyNoteCard key={note.id} note={note} onDelete={onDelete} />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
