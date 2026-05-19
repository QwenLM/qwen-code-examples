import { Printer } from "lucide-react";

interface PrintButtonProps {
  onClick: () => void;
  disabled: boolean;
  isPrinting: boolean;
}

export default function PrintButton({ onClick, disabled, isPrinting }: PrintButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isPrinting}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium
        transition-all duration-200
        ${disabled || isPrinting
          ? "bg-stone-400 cursor-not-allowed"
          : "bg-stone-700 hover:bg-stone-800 active:scale-[0.98]"
        }`}
    >
      <Printer size={18} />
      {isPrinting ? "打印中..." : "Print"}
    </button>
  );
}
