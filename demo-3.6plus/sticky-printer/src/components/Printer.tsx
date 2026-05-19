import { useState, useCallback } from "react";
import NoteInput from "./NoteInput";
import ColorPicker, { type ColorName } from "./ColorPicker";
import PrintButton from "./PrintButton";
import Paper from "./Paper";

const COLOR_HEX: Record<ColorName, string> = {
  yellow: "#fef3c7",
  pink: "#fce7f3",
  blue: "#dbeafe",
  green: "#d1fae5",
  purple: "#ede9fe",
  orange: "#ffedd5",
};

type PrintPhase = "idle" | "inserting" | "printing" | "ejecting" | "flying";

interface PrinterProps {
  onPrintComplete: (text: string, color: ColorName) => void;
}

const PHASE_TIMING: Record<PrintPhase, number> = {
  idle: 0,
  inserting: 300,
  printing: 500,
  ejecting: 800,
  flying: 600,
};

export default function Printer({ onPrintComplete }: PrinterProps) {
  const [text, setText] = useState("");
  const [color, setColor] = useState<ColorName>("yellow");
  const [isPrinting, setIsPrinting] = useState(false);
  const [phase, setPhase] = useState<PrintPhase>("idle");

  const canPrint = text.trim().length > 0 && text.length <= 100;

  const handlePrint = useCallback(() => {
    if (!canPrint || isPrinting) return;
    setIsPrinting(true);

    setPhase("inserting");
    setTimeout(() => {
      setPhase("printing");
      setTimeout(() => {
        setPhase("ejecting");
        setTimeout(() => {
          setPhase("flying");
          setTimeout(() => {
            onPrintComplete(text, color);
            setText("");
            setPhase("idle");
            setIsPrinting(false);
          }, PHASE_TIMING.flying);
        }, PHASE_TIMING.ejecting);
      }, PHASE_TIMING.printing);
    }, PHASE_TIMING.inserting);
  }, [canPrint, isPrinting, text, color, onPrintComplete]);

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl shadow-xl">
      {/* Printer body */}
      <div className="bg-gradient-to-b from-stone-300 to-stone-400 p-6 pb-4 border border-stone-500">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-stone-600 tracking-widest uppercase">
            StickyPrint 3000
          </span>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <div className="w-2 h-2 rounded-full bg-stone-500" />
          </div>
        </div>

        <NoteInput value={text} onChange={setText} disabled={isPrinting} />
        <div className="mt-4 flex items-center justify-between">
          <ColorPicker selected={color} onSelect={setColor} disabled={isPrinting} />
          <PrintButton onClick={handlePrint} disabled={!canPrint} isPrinting={isPrinting} />
        </div>
      </div>

      {/* Paper exit slot */}
      <div className="bg-stone-500 border-t-4 border-stone-600 px-6 py-2 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-stone-700 rounded-b" />
        <Paper phase={phase} text={text} color={COLOR_HEX[color]} />
      </div>

      {/* Paper tray / base */}
      <div className="h-6 bg-gradient-to-b from-stone-500 to-stone-600 border-t border-stone-700" />
      <div className="h-3 bg-stone-700 rounded-b-2xl" />
    </div>
  );
}
