import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";

export interface StickyNote {
  id: string;
  text: string;
  color: string;
  createdAt: number;
}

interface StickyNoteProps {
  note: StickyNote;
  onDelete: (id: string) => void;
}

export default function StickyNoteCard({ note, onDelete }: StickyNoteProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => onDelete(note.id), 400);
  };

  const timeStr = new Date(note.createdAt).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      className={`relative ${note.color} rounded-sm shadow-md p-4
        hover:shadow-lg transition-shadow duration-200
        cursor-grab active:cursor-grabbing`}
      layout
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.1}
      dragSnapToOrigin
      whileDrag={{ scale: 1.05, boxShadow: "0 20px 40px rgba(0,0,0,0.15)", zIndex: 10 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      animate={isDeleting ? { scale: 0.8, rotate: -12, opacity: 0 } : {}}
      transition={isDeleting ? { duration: 0.4 } : { type: "spring", stiffness: 300, damping: 25 }}
    >
      {isHovered && (
        <button
          onClick={handleDelete}
          className="absolute top-1 right-1 p-1 rounded-full bg-black/10 hover:bg-black/20 transition-colors"
          aria-label="删除便签"
        >
          <X size={14} className="text-stone-600" />
        </button>
      )}

      <p className="font-handwriting text-stone-800 text-lg leading-relaxed mt-2 break-words">
        {note.text}
      </p>

      <p className="text-[10px] text-stone-400 mt-3 text-right">{timeStr}</p>
    </motion.div>
  );
}
