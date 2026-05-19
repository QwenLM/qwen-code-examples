import { useState } from "react";
import Printer from "./components/Printer";
import Board from "./components/Board";
import type { StickyNote } from "./components/Board";
import type { ColorName } from "./components/ColorPicker";

const COLOR_MAP: Record<ColorName, string> = {
  yellow: "bg-note-yellow",
  pink: "bg-note-pink",
  blue: "bg-note-blue",
  green: "bg-note-green",
  purple: "bg-note-purple",
  orange: "bg-note-orange",
};

export default function App() {
  const [notes, setNotes] = useState<StickyNote[]>([]);

  const handlePrintComplete = (text: string, color: ColorName) => {
    const note: StickyNote = {
      id: crypto.randomUUID(),
      text,
      color: COLOR_MAP[color],
      createdAt: Date.now(),
    };
    setNotes((prev) => [...prev, note]);
  };

  const handleDelete = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <main className="min-h-screen bg-stone-100 flex flex-col items-center gap-8 py-12 px-4">
      <h1 className="text-3xl font-bold text-stone-700">便签打印机</h1>
      <p className="text-stone-500">输入文字，打印便签，拖到看板上</p>

      <Printer onPrintComplete={handlePrintComplete} />
      <Board notes={notes} onDelete={handleDelete} />
    </main>
  );
}
